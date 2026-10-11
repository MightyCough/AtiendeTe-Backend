#pragma once

// Copia este archivo a include/config.h y completa la red del laboratorio.
// config.h no se sube a git (tiene la clave del WiFi).

// WiFi del router o del hotspot del celular. El laptop debe estar en la misma red.
#define WIFI_SSID "NOMBRE_DE_LA_RED"
#define WIFI_PASSWORD "CLAVE_WIFI"

// IP del laptop donde corre Mosquitto (docker compose). No uses localhost.
#define MQTT_BROKER "192.168.1.10"
#define MQTT_PORT 1883

// Número impreso en el QR de esta mesa (el seed crea 1, 2 y 3).
#define MESA_NUMERO 1

// true: LED de ánodo común (la pata común va a 3V3).
// false: LED de cátodo común (la pata común va a GND).
constexpr bool LED_ANODO_COMUN = false;

// Tope de PWM, de 1 a 255. Va bajo a propósito: sin resistencias el LED y el
// GPIO se pueden quemar. Lo correcto es poner 220 ohm en R, G y B; con eso
// se puede subir este valor.
constexpr int BRILLO_MAX = 40;
