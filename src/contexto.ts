import type { PrismaClient } from '@prisma/client'
import type { FastifyBaseLogger } from 'fastify'
import type { MqttClient } from 'mqtt'
import type { Server } from 'socket.io'
import type { Traductor } from './dominio/traductor.js'

export type Contexto = {
  prisma: PrismaClient
  io: Server
  mqtt: MqttClient
  traductor: Traductor
  log: FastifyBaseLogger
}
