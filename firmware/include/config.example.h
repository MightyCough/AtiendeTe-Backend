#pragma once

#include <stdint.h>

// Copia este archivo a include/config.h y completa la red del laboratorio.
// config.h no se sube a git (tiene la clave del WiFi).

// WiFi del router o del hotspot del celular. El laptop debe estar en la misma red.
#define WIFI_SSID "NOMBRE_DE_LA_RED"
#define WIFI_PASSWORD "CLAVE_WIFI"

// IP del laptop donde corre Mosquitto (docker compose). No uses localhost.
#define MQTT_BROKER "192.168.1.10"
#define MQTT_PORT 1883

// true: ánodo común. La pata más larga (común) va a 3V3 y el PWM se invierte,
// así el valor 0 queda apagado (duty completo).
// false: cátodo común. La pata más larga va a GND.
// Tiene que ser un #define. Si config.h no lo trae, el firmware asume true.
#define LED_ANODO_COMUN true

// Tope de PWM, de 1 a 255. Va bajo a propósito: sin resistencias el LED y el
// GPIO se pueden quemar. Lo correcto es poner 220 ohm en R, G y B; con eso
// se puede subir este valor.
// Si config.h no lo trae, el firmware usa 40. Un constexpr viejo también vale.
constexpr int BRILLO_MAX = 40;

// Una fila por LED. `numero` es el de la mesa (el del QR). Los pines son R, G y B.
// Para la mesa 3, descomenta la última fila. No hace falta otra placa.
// Si config.h no trae este arreglo, el firmware usa las dos primeras filas.
struct MesaLed {
  uint8_t numero;
  uint8_t rojo;
  uint8_t verde;
  uint8_t azul;
};

#define ATIENDETE_TIENE_MESAS
static constexpr MesaLed MESAS[] = {
  {1, 25, 26, 27},
  {2, 32, 33, 14},
  // {3, 18, 19, 21},
};
