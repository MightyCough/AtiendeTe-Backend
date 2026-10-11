// Punto de arranque: PostgreSQL, Fastify, Socket.IO y Mosquitto en la red local.

import { construirApp, type Aplicacion } from './app.js'
import { cargarEnv, leerConfig } from './config.js'
import { crearTraductor } from './dominio/traductor.js'
import { conectarBroker, leerConexion } from './mqtt.js'
import { prisma } from './prisma.js'
import { registrarConexion } from './servicios/mesas.js'

cargarEnv()
const config = leerConfig()
const traductor = crearTraductor(config.googleTranslateApiKey)
const mqtt = conectarBroker(config.mqttUrl)

// El broker puede entregar un "online" retenido antes de que Fastify termine de armarse.
const pendientes: { topico: string; payload: Buffer }[] = []
let aplicacion: Aplicacion | undefined

function alMensajeMqtt(topico: string, payload: Buffer): void {
  if (!aplicacion) return
  const { app, io } = aplicacion
  const aviso = leerConexion(topico, payload)
  if (!aviso) return
  void registrarConexion(prisma, aviso.numero, aviso.online)
    .then((mesa) => {
      if (!mesa) {
        app.log.warn({ numero: aviso.numero }, 'Conexión MQTT de una mesa que no existe')
        return
      }
      io.emit('mesa:conexion', { numero: mesa.numero, online: mesa.online })
      app.log.info({ numero: mesa.numero, online: mesa.online }, 'Conexión de mesa actualizada')
    })
    .catch((error: unknown) => {
      app.log.error(error, 'No se pudo actualizar la conexión de la mesa')
    })
}

mqtt.on('message', (topico, payload) => {
  const copia = Buffer.from(payload)
  if (!aplicacion) {
    pendientes.push({ topico, payload: copia })
    return
  }
  alMensajeMqtt(topico, copia)
})

aplicacion = await construirApp({ prisma, mqtt, traductor })
const { app } = aplicacion
for (const pendiente of pendientes.splice(0)) {
  alMensajeMqtt(pendiente.topico, pendiente.payload)
}

async function cerrar(): Promise<void> {
  await app.close()
  await new Promise<void>((resolver) => {
    mqtt.end(true, {}, () => resolver())
  })
  await prisma.$disconnect()
}

for (const senal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(senal, () => {
    void cerrar().then(() => process.exit(0))
  })
}

await prisma.$connect()
await app.listen({ host: config.host, port: config.puerto })
app.log.info(
  `AtiendeTe escuchando en http://${config.host}:${config.puerto} (traductor ${config.googleTranslateApiKey ? 'Google' : 'directo'})`,
)
