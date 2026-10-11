# AtiendeTe

Pedidos de mesa para el curso de IoT de la Universidad de Huánuco. El cliente lee un QR, arma el pedido en el celular (español o inglés) y la cocina lo ve en una pantalla. Cada mesa tiene un ESP32 DevKit V1 con un LED RGB que muestra el estado. Todo corre en la red local: un laptop, un router o el hotspot de un celular. No hace falta nube.

Este repositorio es la API, la base de datos y el firmware. El menú web (React, puerto 5173) está en otro repositorio y consume el contrato de más abajo tal cual.

```
Celular  --QR-->  menú :5173  --HTTP/Socket.IO-->  API :3000  -->  PostgreSQL
                                                      |
                                                      +-->  Mosquitto :1883  -->  ESP32  -->  LED
Cocina   -------------- pantalla :5173 --------------+
```

Estados del pedido, en este orden: `RECIBIDO` → `EN_PREPARACION` → `LISTO` → `ENTREGADO`.

| Estado | LED |
| --- | --- |
| `RECIBIDO` | azul fijo |
| `EN_PREPARACION` | ámbar fijo |
| `LISTO` | verde, parpadea unos 6 segundos y queda fijo |
| `ENTREGADO` | apagado |
| sin pedido | apagado |
| sin WiFi o sin MQTT | rojo, parpadeo lento |

## Requisitos en Nobara / Fedora

- Node.js 20 o superior (`node -v`)
- Docker con el plugin Compose (`docker compose version`)
- Para flashear: Python 3, PlatformIO y el usuario en el grupo `dialout`
- Los clientes MQTT de prueba: paquete `mosquitto`

```bash
sudo dnf install nodejs npm docker docker-compose python3-pip mosquitto
sudo systemctl enable --now docker
sudo usermod -aG docker,dialout "$USER"
```

Cierra la sesión y vuelve a entrar para que los grupos apliquen. Si `docker` no está en los repos de tu versión, instala el motor que deje el comando `docker compose` disponible (en algunas Fedora es `moby-engine` + `docker-cli` + `docker-compose`).

PlatformIO:

```bash
python3 -m pip install --user platformio
# ~/.local/bin tiene que estar en el PATH
pio --version
```

En Fedora el puerto del ESP32 a veces lo secuestra `brltty` (placas con chip CH340). Si `/dev/ttyUSB0` aparece y desaparece:

```bash
sudo dnf remove brltty
```

## Levantar el backend

En la raíz del repositorio:

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:setup
npm run dev
```

`db:setup` aplica las migraciones y siembra el menú. La API queda en `http://0.0.0.0:3000` (todas las interfaces, para que entren los celulares).

PostgreSQL y Mosquitto quedan en Docker. La API se deja en `npm run dev` para ver los logs en clase. `npm test` no necesita la base: prueba el total, las transiciones, el día en Lima, el texto MQTT de conexión y el traductor por defecto.

Volver a sembrar **borra los pedidos** y reinicia los id del menú:

```bash
npm run db:seed
```

`docker compose down` apaga los contenedores y conserva los datos. `docker compose down -v` borra también el volumen de Postgres.

### Firewall

En Nobara/Fedora, firewalld suele bloquear al celular y al ESP32. Abre la API, el broker y el puerto del menú web:

```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=1883/tcp
sudo firewall-cmd --permanent --add-port=5173/tcp
sudo firewall-cmd --reload
```

No publiques estos puertos a internet: la API no tiene usuarios ni contraseñas. La red WiFi es el perímetro.

### IP del laptop y el QR

El QR no puede decir `localhost`: el celular tiene que usar la IP del laptop en la WiFi.

```bash
hostname -I
ip -4 addr
```

Usa la dirección de la interfaz WiFi (suele empezar en `192.168.` o `10.`). Ignora `127.0.0.1` y la `172.17.` de Docker.

| Qué | Dirección |
| --- | --- |
| Menú (frontend, otro repo) | `http://<ip>:5173/menu?mesa=1` |
| API | `http://<ip>:3000` |
| Socket.IO | mismo origen que la API, path `/socket.io` |
| MQTT | `<ip>:1883` |

El celular, el laptop y el ESP32 tienen que estar en la misma red. Si el celular está con datos móviles, el QR no va a abrir.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Postgres. El ejemplo apunta a `localhost:5432`, usuario `atiende`, clave `atiende`, base `atiendete`. |
| `MQTT_URL` | Broker. Por defecto `mqtt://localhost:1883`. |
| `HOST` | `0.0.0.0` para escuchar en la LAN. |
| `PORT` | `3000`. |
| `GOOGLE_TRANSLATE_API_KEY` | Opcional. Vacío: las notas se copian tal cual. Con clave: una nota escrita en inglés se traduce al español con Google Cloud Translation API v2. Si Google falla, el pedido se crea igual y `notaEs` queda con el texto original. |

## Contrato compartido con el frontend

Base: `http://<ip-del-laptop>:3000`. JSON. CORS acepta cualquier origen (el menú vive en otro puerto de la misma LAN). Los precios son números en soles, no strings. Las fechas son ISO-8601 en UTC. El día "hoy" y el filtro `fecha` se interpretan en `America/Lima` (UTC−5), el huso de Huánuco.

Errores: `{ "error": "mensaje en español" }`. A veces la validación agrega `detalles`. El cliente debe mirar el código HTTP.

| Código | Cuándo |
| --- | --- |
| 200 | Lectura o cambio de estado correcto |
| 201 | Pedido creado |
| 400 | Cuerpo, idioma, estado o transición inválidos; producto o adicional que no corresponde |
| 404 | Mesa, pedido o ruta inexistente |
| 500 | Fallo interno |

No hay autenticación.

### Menú

`GET /api/menu?lang=es` o `lang=en`. Si falta `lang`, se usa español. Si una traducción no existe, se devuelve la española.

Respuesta: un arreglo de categorías. `ingredientes` son los que el cliente puede quitar. `imagenUrl` es `null` en la semilla (el frontend muestra la tarjeta sin foto).

```json
[
  {
    "id": 1,
    "nombre": "Pollo broaster",
    "productos": [
      {
        "id": 1,
        "nombre": "Cuarto de pollo broaster",
        "descripcion": "Pierna y muslo crocantes, con papas fritas y ensalada fresca.",
        "precio": 18,
        "imagenUrl": null,
        "disponible": true,
        "adicionales": [
          { "id": 4, "nombre": "Papas extra", "precioExtra": 4 },
          { "id": 5, "nombre": "Crema de rocoto", "precioExtra": 1.5 },
          { "id": 6, "nombre": "Ají casero", "precioExtra": 1 }
        ],
        "ingredientes": [
          { "id": 7, "nombre": "Ensalada" }
        ]
      }
    ]
  }
]
```

Con `lang=en` el mismo producto se llama `Quarter broaster chicken` y el adicional 4, `Extra fries`.

### Mesas

`GET /api/mesas` devuelve un arreglo. `GET /api/mesas/1` devuelve un objeto. 404 si el número no existe.

```json
{ "numero": 1, "online": false, "ultimaConexion": null }
```

`ultimaConexion` es la última vez que el servidor recibió `online` de esa mesa. Un `offline` apaga el flag y no mueve la fecha.

### Pedidos

`POST /api/pedidos`

```json
{
  "mesa": 1,
  "idioma": "es",
  "items": [
    {
      "productoId": 1,
      "cantidad": 1,
      "adicionales": [4],
      "sinIngredientes": [7],
      "nota": "poco ají"
    }
  ]
}
```

`adicionales` y `sinIngredientes` pueden omitirse. Si un id viene repetido, cuenta una sola vez. `nota` es opcional, hasta 300 caracteres. `idioma` es `es` o `en`. La mesa y los id tienen que existir; el adicional y el ingrediente tienen que pertenecer a ese producto; el producto tiene que estar disponible. El total lo calcula el servidor. Quitar un ingrediente no cambia el precio.

Fórmula, por línea y luego suma:

```
subtotal = (precioUnitario + suma de precioExtra) × cantidad
```

En el ejemplo: cuarto de pollo 18 + papas extra 4 = 22.

La respuesta (201) es el pedido para el cliente: los nombres van en el `idioma` del pedido. `nota` es el texto original y `notaEs` es la versión en español (idéntica si no hay clave de Google o si el pedido ya estaba en español).

```json
{
  "id": 1,
  "mesa": 1,
  "idioma": "es",
  "estado": "RECIBIDO",
  "total": 22,
  "creadoEn": "2026-10-10T22:15:00.000Z",
  "actualizadoEn": "2026-10-10T22:15:00.000Z",
  "items": [
    {
      "id": 1,
      "productoId": 1,
      "nombre": "Cuarto de pollo broaster",
      "cantidad": 1,
      "precioUnitario": 18,
      "subtotal": 22,
      "nota": "poco ají",
      "notaEs": "poco ají",
      "adicionales": [{ "id": 4, "nombre": "Papas extra", "precioExtra": 4 }],
      "sinIngredientes": [{ "id": 7, "nombre": "Ensalada" }]
    }
  ]
}
```

`precioUnitario` es el precio base guardado al pedir, sin adicionales. Si mañana cambia la carta, el pedido viejo no se mueve.

`GET /api/pedidos/1` es la misma forma, en el idioma del pedido. Sirve para la vista del cliente.

`GET /api/pedidos?estado=RECIBIDO&fecha=2026-10-10` es la vista de cocina. Los dos query son opcionales. `estado` vacío se ignora. `fecha` es `YYYY-MM-DD` en Lima. Los nombres de productos, adicionales e ingredientes salen **siempre en español**. El orden es por creación, el más antiguo primero. `nota` sigue siendo el original y `notaEs` el español, para que la cocina lea `notaEs`.

`PATCH /api/pedidos/1/estado` con `{ "estado": "EN_PREPARACION" }`. Solo se acepta el estado siguiente. Respuesta:

```json
{ "id": 1, "mesa": 1, "estado": "EN_PREPARACION" }
```

### Reporte del día

`GET /api/reportes/hoy`

```json
{
  "pedidos": 1,
  "totalVendido": 22,
  "topProductos": [
    {
      "productoId": 1,
      "nombre": "Cuarto de pollo broaster",
      "cantidad": 1,
      "total": 22
    }
  ]
}
```

`pedidos` es la cantidad de pedidos creados hoy (cualquier estado: no hay anulaciones). `totalVendido` suma sus totales. `topProductos` trae hasta 5, nombres en español, ordenados por cantidad. `total` de cada uno es la suma de los subtotales de sus líneas (base + extras).

### Socket.IO

El cliente se conecta a `http://<ip>:3000` con `socket.io-client` (path por defecto `/socket.io`). El servidor solo emite; el frontend no tiene que publicar eventos.

| Evento | Payload | Cuándo |
| --- | --- | --- |
| `pedido:nuevo` | Pedido completo, **nombres en español** (la misma forma que `GET /api/pedidos`) | Al crear |
| `pedido:actualizado` | `{ "id": 1, "mesa": 1, "estado": "LISTO" }` | Al cambiar de estado. No trae el pedido entero: la pantalla actualiza el estado o vuelve a pedir la lista. |
| `mesa:conexion` | `{ "numero": 1, "online": true }` | Cuando llega `online` u `offline` por MQTT. No incluye `ultimaConexion`; eso está en `GET /api/mesas`. |

### MQTT

| Tópico | Quién publica | Cuerpo | Retenido |
| --- | --- | --- | --- |
| `atiendete/mesa/{numero}/estado` | API, al crear y en cada cambio de estado | `{"pedidoId":1,"estado":"RECIBIDO"}` | sí |
| `atiendete/mesa/{numero}/conexion` | ESP32 | texto `online` o `offline`, no JSON | sí |

El firmware deja un Last Will `offline` en el tópico de conexión. Si la placa se apaga, Mosquitto avisa al backend, la mesa pasa a `online: false` y se emite `mesa:conexion`.

El LED muestra el último estado publicado para esa mesa. En la demo conviene un pedido activo por mesa: un pedido nuevo pisa el color del anterior.

El broker acepta conexiones anónimas en el puerto 1883. Es a propósito, para el laboratorio.

### Id estables después del seed

Volver a sembrar reinicia las secuencias. Con la base recién sembrada:

Adicionales: 1 Queso 2.00, 2 Huevo frito 2.50, 3 Tocino 3.50, 4 Papas extra 4.00, 5 Crema de rocoto 1.50, 6 Ají casero 1.00.

Ingredientes que se pueden quitar: 1 Lechuga, 2 Tomate, 3 Cebolla, 4 Mayonesa, 5 Kétchup, 6 Mostaza, 7 Ensalada.

| Id | Producto | S/ | Extras | Se puede quitar |
| --- | --- | --- | --- | --- |
| 1 | Cuarto de pollo broaster | 18 | 4, 5, 6 | 7 |
| 2 | Medio pollo broaster | 32 | 4, 5, 6 | 7 |
| 3 | Alitas broaster (6) | 16 | 4, 5, 6 | — |
| 4 | Hamburguesa clásica | 14 | 1, 2, 3, 4 | 1–6 |
| 5 | Hamburguesa royal | 20 | 1, 2, 3, 4 | 1–5 |
| 6 | Hamburguesa de pollo | 16 | 1, 4 | 1, 2, 4 |
| 7 | Salchipapa clásica | 12 | 1, 2, 3 | 4, 5, 6 |
| 8 | Salchipapa broaster | 18 | 1, 2, 5 | 4, 5 |
| 9 | Salchipapa royal | 22 | 3, 4 | 4, 5, 6 |
| 10 | Inca Kola 500 ml | 5 | — | — |
| 11 | Chicha morada | 4.50 | — | — |
| 12 | Limonada frozen | 7 | — | — |
| 13 | Agua mineral | 3 | — | — |
| 14 | Mazamorra morada | 6 | — | — |
| 15 | Arroz con leche | 6 | — | — |
| 16 | Suspiro a la limeña | 8 | — | — |

Mesas sembradas: 1, 2 y 3, desconectadas.

El historial de estados (`PedidoEstadoHistorial`) se guarda en la base en cada transición, incluido el `RECIBIDO` inicial. No sale en el JSON.

## Probar la API a mano

Con `npm run dev` corriendo y la semilla cargada:

```bash
curl -s 'http://localhost:3000/api/menu?lang=es'
curl -s http://localhost:3000/api/mesas

curl -s -X POST http://localhost:3000/api/pedidos \
  -H 'Content-Type: application/json' \
  -d '{"mesa":1,"idioma":"es","items":[{"productoId":1,"cantidad":1,"adicionales":[4],"sinIngredientes":[7],"nota":"poco ají"}]}'

curl -s -X PATCH http://localhost:3000/api/pedidos/1/estado \
  -H 'Content-Type: application/json' \
  -d '{"estado":"EN_PREPARACION"}'

curl -s 'http://localhost:3000/api/pedidos?estado=EN_PREPARACION'
curl -s http://localhost:3000/api/reportes/hoy
```

Un salto (`RECIBIDO` → `LISTO`) responde 400.

## Probar MQTT con mosquitto_pub y mosquitto_sub

En una terminal, escucha todo lo de las mesas (el `-r` de más abajo deja el mensaje retenido, así que el sub lo ve aunque llegues tarde):

```bash
mosquitto_sub -h localhost -t 'atiendete/mesa/#' -v
```

En otra, simula la placa de la mesa 1:

```bash
mosquitto_pub -h localhost -t 'atiendete/mesa/1/conexion' -m 'online' -r
curl -s http://localhost:3000/api/mesas/1
```

La mesa queda `online: true` y la API emite `mesa:conexion`. Crea o avanza un pedido (los `curl` de arriba) y en el sub aparece:

```text
atiendete/mesa/1/estado {"pedidoId":1,"estado":"RECIBIDO"}
```

Para leer solo el estado retenido y salir:

```bash
mosquitto_sub -h localhost -t 'atiendete/mesa/1/estado' -v -C 1
```

Simula el Last Will (la placa se cayó):

```bash
mosquitto_pub -h localhost -t 'atiendete/mesa/1/conexion' -m 'offline' -r
```

Si no quieres instalar el cliente en el host, el contenedor ya lo trae:

```bash
docker compose exec mosquitto mosquitto_sub -t 'atiendete/mesa/#' -v
docker compose exec mosquitto mosquitto_pub -t 'atiendete/mesa/1/conexion' -m 'online' -r
```

## Firmware (ESP32 DevKit V1, 30 pines)

Proyecto PlatformIO en `firmware/`, framework Arduino, placa `esp32dev`. Librerías: PubSubClient y ArduinoJson.

### Cableado del LED RGB de 4 patas

La pata más larga suele ser la común. Hay que saber si el LED es de cátodo común o de ánodo común y dejarlo escrito en `config.h` (`LED_ANODO_COMUN`).

```text
ESP32 DevKit V1                         LED RGB
GPIO25 (D25) ------[220 Ω]------------- pata R
GPIO26 (D26) ------[220 Ω]------------- pata G
GPIO27 (D27) ------[220 Ω]------------- pata B
GND ----------------------------------- pata común     cátodo común
3V3 ----------------------------------- pata común     ánodo común (en vez de GND)
```

Una resistencia de 220 Ω por canal (rojo, verde y azul). Sin resistencia el pico de corriente puede dañar el LED y el GPIO. `BRILLO_MAX` sale en 40 (de 255) para bajar el riesgo si todavía no hay resistencias; no reemplaza a las resistencias. Con las de 220 Ω se puede subir el brillo en `config.h`.

### Configuración y flasheo

```bash
cd firmware
cp include/config.example.h include/config.h
```

Edita `config.h`: SSID, clave, IP del laptop (la del QR, no `localhost`), puerto 1883 y `MESA_NUMERO` (1, 2 o 3). `config.h` está en `.gitignore`.

`pio run` compila aunque falte `config.h` (usa el ejemplo y avisa). No flashees ese binario: no va a entrar a tu WiFi. El script `firmware/elegir_config.py` decide cuál de los dos headers entra; hace falta porque el SDK del ESP32 ya trae un `config.h` distinto.

```bash
pio run
pio run -t upload
pio device monitor
```

El monitor va a 115200. Comandos, también sin red:

| Tecla | Efecto |
| --- | --- |
| `1` | Fuerza `RECIBIDO` (azul) |
| `2` | Fuerza `EN_PREPARACION` (ámbar) |
| `3` | Fuerza `LISTO` (verde, parpadea y queda fijo) |
| `4` | Fuerza `ENTREGADO` (apagado) |
| `0` | Vuelve al modo red |

Un mensaje MQTT de estado cancela el modo prueba. La reconexión de WiFi y de MQTT no usa `delay()`, así el LED y el monitor siguen respondiendo. Al conectar, la placa publica `online` (retenido) y se suscribe a `atiendete/mesa/{numero}/estado`.

PubSubClient solo publica en QoS 0. El `online` igual va retenido. El Last Will `offline` va en QoS 1 y retenido, que es lo que la librería permite en el testamento.

## Pruebas automáticas

```bash
npm test
```

Cubren el total en céntimos (los adicionales se suman al unitario y después se multiplica por la cantidad; quitar ingredientes no descuenta), la cadena de estados, el calendario de Lima, el texto `online`/`offline` y el traductor de paso.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | API en caliente con tsx |
| `npm test` | Pruebas unitarias |
| `npm run build` && `npm start` | Compila a `dist/` y arranca |
| `npm run db:setup` | `prisma migrate deploy` y semilla |
| `npm run db:seed` | Vuelve a sembrar (borra pedidos) |
| `docker compose up -d` | Postgres y Mosquitto |
