// AtiendeTe: el LED de la mesa copia el estado que publica el backend por MQTT.
//
//   RECIBIDO        azul fijo
//   EN_PREPARACION  ámbar fijo
//   LISTO           verde, parpadea unos segundos y queda fijo
//   ENTREGADO       apagado
//   sin pedido      apagado
//   sin WiFi o MQTT rojo lento
//
// Por el monitor serie (115200) se puede forzar un color sin red:
//   1 RECIBIDO, 2 EN_PREPARACION, 3 LISTO, 4 ENTREGADO, 0 volver al modo red.
// No usamos delay(): el parpadeo y la reconexión tienen que convivir.

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

static const uint8_t PIN_ROJO = 25;
static const uint8_t PIN_VERDE = 26;
static const uint8_t PIN_AZUL = 27;

static const uint8_t CANAL_ROJO = 0;
static const uint8_t CANAL_VERDE = 1;
static const uint8_t CANAL_AZUL = 2;

static const unsigned long REINTENTO_MS = 3000;
static const unsigned long LISTO_PARPADEO_MS = 6000;
static const unsigned long LISTO_INTERVALO_MS = 300;
static const unsigned long ROJO_INTERVALO_MS = 800;

enum class EstadoPedido : uint8_t {
  Ninguno = 0,
  Recibido = 1,
  EnPreparacion = 2,
  Listo = 3,
  Entregado = 4,
};

WiFiClient red;
PubSubClient mqtt(red);

char topicoEstado[48];
char topicoConexion[48];
char clienteId[32];

EstadoPedido estadoRed = EstadoPedido::Ninguno;
EstadoPedido estadoForzado = EstadoPedido::Ninguno;
bool modoPrueba = false;
bool listoParpadeando = false;
unsigned long listoDesde = 0;

unsigned long ultimoIntentoWifi = 0;
unsigned long ultimoIntentoMqtt = 0;
bool wifiAnunciado = false;
bool mqttAnunciado = false;

int brilloTope() {
  if (BRILLO_MAX < 1) return 1;
  if (BRILLO_MAX > 255) return 255;
  return BRILLO_MAX;
}

void iniciarPwm() {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcAttach(PIN_ROJO, 5000, 8);
  ledcAttach(PIN_VERDE, 5000, 8);
  ledcAttach(PIN_AZUL, 5000, 8);
#else
  ledcSetup(CANAL_ROJO, 5000, 8);
  ledcAttachPin(PIN_ROJO, CANAL_ROJO);
  ledcSetup(CANAL_VERDE, 5000, 8);
  ledcAttachPin(PIN_VERDE, CANAL_VERDE);
  ledcSetup(CANAL_AZUL, 5000, 8);
  ledcAttachPin(PIN_AZUL, CANAL_AZUL);
#endif
}

void escribirPwm(uint8_t pin, uint8_t canal, uint8_t valor) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(pin, valor);
#else
  ledcWrite(canal, valor);
#endif
}

uint8_t deber(uint8_t intensidad) {
  // Ánodo común: el canal enciende cuando el GPIO baja.
  if (LED_ANODO_COMUN) {
    return static_cast<uint8_t>(255 - intensidad);
  }
  return intensidad;
}

void color(uint8_t rojo, uint8_t verde, uint8_t azul) {
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
  escribirPwm(PIN_ROJO, CANAL_ROJO, deber(r));
  escribirPwm(PIN_VERDE, CANAL_VERDE, deber(g));
  escribirPwm(PIN_AZUL, CANAL_AZUL, deber(b));
}

void apagar() { color(0, 0, 0); }

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

void empezarListo() {
  listoParpadeando = true;
  listoDesde = millis();
}

void aplicarEstado(EstadoPedido estado, bool reiniciarListo) {
  if (reiniciarListo && estado == EstadoPedido::Listo) {
    empezarListo();
  } else if (estado != EstadoPedido::Listo) {
    listoParpadeando = false;
  }
}

void alMensaje(char* topico, byte* carga, unsigned int largo) {
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
  const bool cambio = nuevo != estadoRed;
  estadoRed = nuevo;
  modoPrueba = false;
  aplicarEstado(nuevo, cambio || nuevo == EstadoPedido::Listo);
  Serial.printf("MQTT mesa %d -> %s\n", MESA_NUMERO, nombreEstado(nuevo));
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
  mqttAnunciado = false;
  const unsigned long ahora = millis();
  if (ahora - ultimoIntentoWifi < REINTENTO_MS) return;
  ultimoIntentoWifi = ahora;
  Serial.println("Conectando WiFi...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void mantenerMqtt() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (mqtt.connected()) {
    mqtt.loop();
    if (!mqttAnunciado) {
      mqttAnunciado = true;
      Serial.printf("MQTT OK, mesa %d\n", MESA_NUMERO);
    }
    return;
  }
  mqttAnunciado = false;
  const unsigned long ahora = millis();
  if (ahora - ultimoIntentoMqtt < REINTENTO_MS) return;
  ultimoIntentoMqtt = ahora;

  // Last Will retenido: si la placa se cae, el broker avisa "offline" al backend.
  const bool ok = mqtt.connect(clienteId, topicoConexion, 1, true, "offline");
  if (!ok) {
    Serial.printf("MQTT falló, rc=%d\n", mqtt.state());
    return;
  }
  mqtt.publish(topicoConexion, "online", true);
  mqtt.subscribe(topicoEstado);
  mqttAnunciado = true;
  Serial.printf("MQTT OK, mesa %d\n", MESA_NUMERO);
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
    aplicarEstado(estadoForzado, true);
    Serial.printf("Prueba: %s\n", nombreEstado(estadoForzado));
  }
}

void mostrarListo() {
  if (listoParpadeando && millis() - listoDesde < LISTO_PARPADEO_MS) {
    const bool encendido = ((millis() - listoDesde) / LISTO_INTERVALO_MS) % 2 == 0;
    if (encendido) color(0, 255, 0);
    else apagar();
    return;
  }
  listoParpadeando = false;
  color(0, 255, 0);
}

void mostrarDesconectado() {
  const bool encendido = (millis() / ROJO_INTERVALO_MS) % 2 == 0;
  if (encendido) color(255, 0, 0);
  else apagar();
}

void pintar(EstadoPedido estado) {
  switch (estado) {
    case EstadoPedido::Recibido:
      color(0, 0, 255);
      break;
    case EstadoPedido::EnPreparacion:
      color(255, 140, 0);
      break;
    case EstadoPedido::Listo:
      mostrarListo();
      break;
    case EstadoPedido::Entregado:
    case EstadoPedido::Ninguno:
      apagar();
      break;
  }
}

void actualizarLed() {
  // El modo prueba gana aunque no haya red: sirve para ver el LED en la mesa de trabajo.
  if (modoPrueba) {
    pintar(estadoForzado);
    return;
  }
  const bool enlace = WiFi.status() == WL_CONNECTED && mqtt.connected();
  if (!enlace) {
    mostrarDesconectado();
    return;
  }
  pintar(estadoRed);
}

void setup() {
  Serial.begin(115200);
  iniciarPwm();
  apagar();

  snprintf(topicoEstado, sizeof(topicoEstado), "atiendete/mesa/%d/estado", MESA_NUMERO);
  snprintf(topicoConexion, sizeof(topicoConexion), "atiendete/mesa/%d/conexion", MESA_NUMERO);
  snprintf(clienteId, sizeof(clienteId), "atiendete-mesa-%d", MESA_NUMERO);

  WiFi.mode(WIFI_STA);
  WiFi.persistent(false);
  WiFi.setAutoReconnect(true);
  // Sin esto el módem duerme y Mosquitto corta el keepalive a mitad de la clase.
  WiFi.setSleep(WIFI_PS_NONE);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(alMensaje);
  mqtt.setBufferSize(256);
  mqtt.setKeepAlive(30);
  // setup() ya llamó a WiFi.begin. El siguiente intento espera REINTENTO_MS.
  ultimoIntentoWifi = millis();

  Serial.println("AtiendeTe listo. Comandos: 1 recibido, 2 preparacion, 3 listo, 4 entregado, 0 red.");
}

void loop() {
  leerSerial();
  mantenerWifi();
  mantenerMqtt();
  actualizarLed();
}
