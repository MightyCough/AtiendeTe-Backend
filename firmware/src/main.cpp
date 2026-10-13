// AtiendeTe: una ESP32 y un LED RGB por mesa. Cada LED copia el estado que
// el backend publica por MQTT para esa mesa.
//
//   RECIBIDO        azul fijo
//   EN_PREPARACION  ámbar fijo
//   LISTO           verde, parpadea unos segundos y queda fijo
//   ENTREGADO       apagado
//   sin pedido      apagado
//   sin WiFi          rojo lento, en todos los LED
//   sin MQTT de una  rojo lento, solo en ese LED
//
// Por el monitor serie (115200) se puede forzar un color sin red.
// El comando pinta todos los LED a la vez:
//   1 RECIBIDO, 2 EN_PREPARACION, 3 LISTO, 4 ENTREGADO, 0 volver al modo red.
// No usamos delay(): el parpadeo y la reconexión tienen que convivir.
//
// Cada mesa abre su propia sesión MQTT. PubSubClient solo admite un Last Will
// por conexión; así atiendete/mesa/N/conexion de cada una recibe offline si
// la placa se cae, y online cuando conecta. El backend ve todas las mesas.

#include <Arduino.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFi.h>

// elegir_config.py define ATIENDETE_USA_CONFIG solo si existe include/config.h.
// Un #include "config.h" a ciegas agarra el config.h del toolchain, no el nuestro.
#ifdef ATIENDETE_USA_CONFIG
#include "config.h"
#else
#warning "No existe include/config.h. Se compila con config.example.h: copialo y editalo antes de flashear."
#include "config.example.h"
#endif

// Un config.h copiado antes de este flag no lo define. El LED del laboratorio
// es de ánodo común (pata larga a 3V3), así que el default es true.
#ifndef LED_ANODO_COMUN
#define LED_ANODO_COMUN true
#endif

// config.example.h lo trae como constexpr. elegir_config.py define
// ATIENDETE_BRILLO_YA_DECLARADO en ese caso para no pisar el valor con un macro.
// Si no está de ninguna forma, el tope es 40.
#ifndef ATIENDETE_BRILLO_YA_DECLARADO
#ifndef BRILLO_MAX
#define BRILLO_MAX 40
#endif
#endif

// config.h viejo (solo WiFi, broker y a veces MESA_ID o pines sueltos) no trae
// el arreglo. Estas dos filas son el cableado por defecto.
#ifndef ATIENDETE_TIENE_MESAS
struct MesaLed {
  uint8_t numero;
  uint8_t rojo;
  uint8_t verde;
  uint8_t azul;
};

static constexpr MesaLed MESAS[] = {
  {1, 25, 26, 27},
  {2, 32, 33, 14},
};
#endif

static constexpr size_t CANTIDAD_MESAS = sizeof(MESAS) / sizeof(MESAS[0]);
static_assert(CANTIDAD_MESAS >= 1, "Configura al menos una mesa en MESAS");
static_assert(CANTIDAD_MESAS * 3 <= 16, "Cada mesa usa 3 canales LEDC; el ESP32 tiene 16");

// LEDC a 8 bits. El duty va de 0 a BRILLO_MAX_RANGE. El tope de brillo percibido
// sigue siendo BRILLO_MAX, que es más bajo a propósito.
static const uint8_t BRILLO_MAX_RANGE = 255;

static const unsigned long REINTENTO_MS = 3000;
static const unsigned long LISTO_PARPADEO_MS = 6000;
static const unsigned long LISTO_INTERVALO_MS = 300;
static const unsigned long ROJO_INTERVALO_MS = 800;
// connect() bloquea. El default de la librería son 15 s por sesión; con varias
// mesas el parpadeo se congelaría.
static const uint16_t MQTT_TIMEOUT_S = 3;

enum class EstadoPedido : uint8_t {
  Ninguno = 0,
  Recibido = 1,
  EnPreparacion = 2,
  Listo = 3,
  Entregado = 4,
};

struct CanalesPwm {
  uint8_t rojo;
  uint8_t verde;
  uint8_t azul;
};

struct MesaRuntime {
  EstadoPedido estado;
  bool listoParpadeando;
  unsigned long listoDesde;
  bool mqttAnunciado;
  unsigned long ultimoIntentoMqtt;
};

WiFiClient redes[CANTIDAD_MESAS];
PubSubClient clientes[CANTIDAD_MESAS];
CanalesPwm canales[CANTIDAD_MESAS];
MesaRuntime runtimeMesa[CANTIDAD_MESAS];

EstadoPedido estadoForzado = EstadoPedido::Ninguno;
bool modoPrueba = false;
bool pruebaParpadeando = false;
unsigned long pruebaDesde = 0;

unsigned long ultimoIntentoWifi = 0;
bool wifiAnunciado = false;

int brilloTope() {
  if (BRILLO_MAX < 1) return 1;
  if (BRILLO_MAX > BRILLO_MAX_RANGE) return BRILLO_MAX_RANGE;
  return BRILLO_MAX;
}

void iniciarPwm() {
  uint8_t canal = 0;
  for (size_t i = 0; i < CANTIDAD_MESAS; i++) {
    canales[i].rojo = canal++;
    canales[i].verde = canal++;
    canales[i].azul = canal++;
#if ESP_ARDUINO_VERSION_MAJOR >= 3
    // Un canal distinto por pata. ledcAttachChannel lo fija; ledcWrite va por pin.
    ledcAttachChannel(MESAS[i].rojo, 5000, 8, canales[i].rojo);
    ledcAttachChannel(MESAS[i].verde, 5000, 8, canales[i].verde);
    ledcAttachChannel(MESAS[i].azul, 5000, 8, canales[i].azul);
#else
    ledcSetup(canales[i].rojo, 5000, 8);
    ledcAttachPin(MESAS[i].rojo, canales[i].rojo);
    ledcSetup(canales[i].verde, 5000, 8);
    ledcAttachPin(MESAS[i].verde, canales[i].verde);
    ledcSetup(canales[i].azul, 5000, 8);
    ledcAttachPin(MESAS[i].azul, canales[i].azul);
#endif
  }
}

void escribirPwm(uint8_t pin, uint8_t canal, uint8_t valor) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  (void)canal;
  ledcWrite(pin, valor);
#else
  (void)pin;
  ledcWrite(canal, valor);
#endif
}

uint8_t deber(uint8_t valor) {
  // Ánodo común: la pata larga está en 3V3 y el canal enciende con el GPIO en bajo.
  // valor 0 (apagado) tiene que escribir duty completo; un duty bajo lo deja encendido.
  if (LED_ANODO_COMUN) {
    return static_cast<uint8_t>(BRILLO_MAX_RANGE - valor);
  }
  return valor;
}

void colorMesa(size_t indice, uint8_t rojo, uint8_t verde, uint8_t azul) {
  const uint8_t mayor = max(rojo, max(verde, azul));
  const int tope = brilloTope();
  uint8_t r = 0;
  uint8_t g = 0;
  uint8_t b = 0;
  if (mayor > 0) {
    r = static_cast<uint8_t>(static_cast<uint16_t>(rojo) * tope / mayor);
    g = static_cast<uint8_t>(static_cast<uint16_t>(verde) * tope / mayor);
    b = static_cast<uint8_t>(static_cast<uint16_t>(azul) * tope / mayor);
  }
  escribirPwm(MESAS[indice].rojo, canales[indice].rojo, deber(r));
  escribirPwm(MESAS[indice].verde, canales[indice].verde, deber(g));
  escribirPwm(MESAS[indice].azul, canales[indice].azul, deber(b));
}

void apagarMesa(size_t indice) {
  // ENTREGADO, la tecla 4 y las fases apagadas del parpadeo.
  // Con ánodo común los tres canales quedan en BRILLO_MAX_RANGE (duty completo).
  colorMesa(indice, 0, 0, 0);
}

void apagarTodas() {
  for (size_t i = 0; i < CANTIDAD_MESAS; i++) apagarMesa(i);
}

const char* nombreEstado(EstadoPedido estado) {
  switch (estado) {
    case EstadoPedido::Recibido:
      return "RECIBIDO";
    case EstadoPedido::EnPreparacion:
      return "EN_PREPARACION";
    case EstadoPedido::Listo:
      return "LISTO";
    case EstadoPedido::Entregado:
      return "ENTREGADO";
    default:
      return "NINGUNO";
  }
}

bool interpretarEstado(const char* texto, EstadoPedido& destino) {
  if (strcmp(texto, "RECIBIDO") == 0) {
    destino = EstadoPedido::Recibido;
    return true;
  }
  if (strcmp(texto, "EN_PREPARACION") == 0) {
    destino = EstadoPedido::EnPreparacion;
    return true;
  }
  if (strcmp(texto, "LISTO") == 0) {
    destino = EstadoPedido::Listo;
    return true;
  }
  if (strcmp(texto, "ENTREGADO") == 0) {
    destino = EstadoPedido::Entregado;
    return true;
  }
  return false;
}

int numeroEnTopico(const char* topico) {
  const char prefijo[] = "atiendete/mesa/";
  const size_t largoPrefijo = sizeof(prefijo) - 1;
  if (strncmp(topico, prefijo, largoPrefijo) != 0) return -1;
  const char* cursor = topico + largoPrefijo;
  if (*cursor < '0' || *cursor > '9') return -1;
  int numero = 0;
  int digitos = 0;
  while (*cursor >= '0' && *cursor <= '9') {
    if (digitos >= 4) return -1;
    numero = numero * 10 + (*cursor - '0');
    cursor++;
    digitos++;
  }
  if (strcmp(cursor, "/estado") != 0) return -1;
  return numero;
}

int indiceMesa(int numero) {
  for (size_t i = 0; i < CANTIDAD_MESAS; i++) {
    if (MESAS[i].numero == numero) return static_cast<int>(i);
  }
  return -1;
}

void alMensaje(char* topico, byte* carga, unsigned int largo) {
  const int numero = numeroEnTopico(topico);
  const int indice = numero >= 0 ? indiceMesa(numero) : -1;
  if (indice < 0) {
    Serial.printf("MQTT: tópico ignorado %s\n", topico);
    return;
  }
  JsonDocument doc;
  const DeserializationError error = deserializeJson(doc, carga, largo);
  if (error) {
    Serial.println("MQTT: JSON de estado ilegible");
    return;
  }
  const char* texto = doc["estado"] | "";
  EstadoPedido nuevo;
  if (!interpretarEstado(texto, nuevo)) {
    Serial.printf("MQTT: estado desconocido en %s\n", topico);
    return;
  }
  MesaRuntime& mesa = runtimeMesa[indice];
  mesa.estado = nuevo;
  // Cada LISTO, aunque repita el mismo estado, vuelve a parpadear.
  if (nuevo == EstadoPedido::Listo) {
    mesa.listoParpadeando = true;
    mesa.listoDesde = millis();
  } else {
    mesa.listoParpadeando = false;
  }
  modoPrueba = false;
  Serial.printf("MQTT mesa %d -> %s\n", MESAS[indice].numero, nombreEstado(nuevo));
}

void mantenerWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiAnunciado) {
      wifiAnunciado = true;
      Serial.print("WiFi OK, IP ");
      Serial.println(WiFi.localIP());
    }
    return;
  }
  wifiAnunciado = false;
  for (size_t i = 0; i < CANTIDAD_MESAS; i++) runtimeMesa[i].mqttAnunciado = false;
  const unsigned long ahora = millis();
  if (ahora - ultimoIntentoWifi < REINTENTO_MS) return;
  ultimoIntentoWifi = ahora;
  Serial.println("Conectando WiFi...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void conectarMesa(size_t indice) {
  char clienteId[32];
  char topicoConexion[48];
  char topicoEstado[48];
  const int numero = MESAS[indice].numero;
  snprintf(clienteId, sizeof(clienteId), "atiendete-mesa-%d", numero);
  snprintf(topicoConexion, sizeof(topicoConexion), "atiendete/mesa/%d/conexion", numero);
  snprintf(topicoEstado, sizeof(topicoEstado), "atiendete/mesa/%d/estado", numero);

  // Last Will retenido de esta mesa. Las otras sesiones tienen el suyo.
  const bool ok = clientes[indice].connect(clienteId, topicoConexion, 1, true, "offline");
  if (!ok) {
    Serial.printf("MQTT mesa %d falló, rc=%d\n", numero, clientes[indice].state());
    return;
  }
  clientes[indice].publish(topicoConexion, "online", true);
  clientes[indice].subscribe(topicoEstado);
  runtimeMesa[indice].mqttAnunciado = true;
  Serial.printf("MQTT OK, mesa %d\n", numero);
}

void mantenerMqtt() {
  if (WiFi.status() != WL_CONNECTED) return;
  for (size_t i = 0; i < CANTIDAD_MESAS; i++) {
    if (clientes[i].connected()) {
      clientes[i].loop();
      if (!runtimeMesa[i].mqttAnunciado) {
        runtimeMesa[i].mqttAnunciado = true;
        Serial.printf("MQTT OK, mesa %d\n", MESAS[i].numero);
      }
      continue;
    }
    runtimeMesa[i].mqttAnunciado = false;
    const unsigned long ahora = millis();
    if (ahora - runtimeMesa[i].ultimoIntentoMqtt < REINTENTO_MS) continue;
    runtimeMesa[i].ultimoIntentoMqtt = ahora;
    conectarMesa(i);
  }
}

void leerSerial() {
  while (Serial.available() > 0) {
    const char caracter = static_cast<char>(Serial.read());
    if (caracter == '\n' || caracter == '\r' || caracter == ' ') continue;
    if (caracter == '0') {
      modoPrueba = false;
      Serial.println("Modo red");
      continue;
    }
    if (caracter < '1' || caracter > '4') continue;
    modoPrueba = true;
    estadoForzado = static_cast<EstadoPedido>(caracter - '0');
    if (estadoForzado == EstadoPedido::Listo) {
      pruebaParpadeando = true;
      pruebaDesde = millis();
    } else {
      pruebaParpadeando = false;
    }
    Serial.printf("Prueba (todas las mesas): %s\n", nombreEstado(estadoForzado));
  }
}

void pintarMesa(size_t indice, EstadoPedido estado, bool& parpadeando, unsigned long desde) {
  switch (estado) {
    case EstadoPedido::Recibido:
      colorMesa(indice, 0, 0, 255);
      break;
    case EstadoPedido::EnPreparacion:
      colorMesa(indice, 255, 140, 0);
      break;
    case EstadoPedido::Listo:
      if (parpadeando && millis() - desde < LISTO_PARPADEO_MS) {
        const bool encendido = ((millis() - desde) / LISTO_INTERVALO_MS) % 2 == 0;
        if (encendido) colorMesa(indice, 0, 255, 0);
        else apagarMesa(indice);
        return;
      }
      parpadeando = false;
      colorMesa(indice, 0, 255, 0);
      break;
    case EstadoPedido::Entregado:
    case EstadoPedido::Ninguno:
      apagarMesa(indice);
      break;
  }
}

void mostrarDesconectado() {
  const bool encendido = (millis() / ROJO_INTERVALO_MS) % 2 == 0;
  for (size_t i = 0; i < CANTIDAD_MESAS; i++) {
    if (encendido) colorMesa(i, 255, 0, 0);
    else apagarMesa(i);
  }
}

void pintarRojoLento(size_t indice) {
  const bool encendido = (millis() / ROJO_INTERVALO_MS) % 2 == 0;
  if (encendido) colorMesa(indice, 255, 0, 0);
  else apagarMesa(indice);
}

void actualizarLeds() {
  // El modo prueba gana aunque no haya red: sirve para ver los LED en la mesa de trabajo.
  // Pinta todos igual, incluidos el parpadeo verde y el apagado.
  if (modoPrueba) {
    for (size_t i = 0; i < CANTIDAD_MESAS; i++) {
      pintarMesa(i, estadoForzado, pruebaParpadeando, pruebaDesde);
    }
    return;
  }
  // Sin WiFi no hay ninguna sesión: rojo en todos. Con WiFi, cada mesa sigue
  // su estado; la que todavía no conectó al broker parpadea sola en rojo.
  if (WiFi.status() != WL_CONNECTED) {
    mostrarDesconectado();
    return;
  }
  for (size_t i = 0; i < CANTIDAD_MESAS; i++) {
    if (!clientes[i].connected()) {
      pintarRojoLento(i);
      continue;
    }
    pintarMesa(i, runtimeMesa[i].estado, runtimeMesa[i].listoParpadeando, runtimeMesa[i].listoDesde);
  }
}

void setup() {
  Serial.begin(115200);
  iniciarPwm();
  apagarTodas();

  for (size_t i = 0; i < CANTIDAD_MESAS; i++) {
    clientes[i].setClient(redes[i]);
    clientes[i].setServer(MQTT_BROKER, MQTT_PORT);
    clientes[i].setCallback(alMensaje);
    clientes[i].setBufferSize(256);
    clientes[i].setKeepAlive(30);
    clientes[i].setSocketTimeout(MQTT_TIMEOUT_S);
  }

  WiFi.mode(WIFI_STA);
  WiFi.persistent(false);
  WiFi.setAutoReconnect(true);
  // Sin esto el módem duerme y Mosquitto corta el keepalive a mitad de la clase.
  WiFi.setSleep(WIFI_PS_NONE);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // setup() ya llamó a WiFi.begin. El siguiente intento espera REINTENTO_MS.
  ultimoIntentoWifi = millis();

  Serial.println("AtiendeTe listo. Comandos: 1 recibido, 2 preparacion, 3 listo, 4 entregado, 0 red.");
  for (size_t i = 0; i < CANTIDAD_MESAS; i++) {
    Serial.printf(
        "Mesa %d  R=%u G=%u B=%u\n",
        MESAS[i].numero,
        MESAS[i].rojo,
        MESAS[i].verde,
        MESAS[i].azul);
  }
}

void loop() {
  leerSerial();
  mantenerWifi();
  mantenerMqtt();
  actualizarLeds();
}
