import { createServer } from 'node:http'
import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'
import { Server } from 'socket.io'
import type { Contexto } from './contexto.js'
import { ErrorHttp } from './errores.js'
import { registrarMenu } from './rutas/menu.js'
import { registrarMesas } from './rutas/mesas.js'
import { registrarPedidos } from './rutas/pedidos.js'
import { registrarReportes } from './rutas/reportes.js'

export type Aplicacion = {
  app: FastifyInstance
  io: Server
}

export async function construirApp(
  parcial: Omit<Contexto, 'io' | 'log'>,
): Promise<Aplicacion> {
  // Fastify no debe responder /socket.io: ese camino es de Socket.IO (polling y websocket).
  const servidorHttp = createServer()
  const app = Fastify({
    logger: true,
    serverFactory(handler) {
      servidorHttp.on('request', (req, res) => {
        if ((req.url ?? '').startsWith('/socket.io')) return
        handler(req, res)
      })
      return servidorHttp
    },
  })

  // Cualquier origen de la LAN (el celular abre el menú en otro puerto).
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  })

  const io = new Server(servidorHttp, {
    cors: { origin: '*' },
    serveClient: false,
  })

  io.on('connection', (socket) => {
    app.log.info({ id: socket.id }, 'Cliente Socket.IO conectado')
    socket.on('disconnect', () => {
      app.log.info({ id: socket.id }, 'Cliente Socket.IO desconectado')
    })
  })

  app.addHook('onClose', async () => {
    io.disconnectSockets(true)
  })

  const ctx: Contexto = { ...parcial, io, log: app.log }
  registrarMenu(app, ctx)
  registrarMesas(app, ctx)
  registrarPedidos(app, ctx)
  registrarReportes(app, ctx)

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({ error: 'Ruta no encontrada' })
  })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ErrorHttp) {
      return reply.code(error.status).send({ error: error.message })
    }
    const codigo = (error as { statusCode?: number }).statusCode
    if (codigo && codigo < 500) {
      return reply.code(codigo).send({ error: 'Datos inválidos' })
    }
    request.log.error(error)
    return reply.code(500).send({ error: 'Error interno' })
  })

  return { app, io }
}
