import type { FastifyInstance } from 'fastify'
import type { Contexto } from '../contexto.js'
import { reporteDeHoy } from '../servicios/reportes.js'

export function registrarReportes(app: FastifyInstance, ctx: Contexto): void {
  app.get('/api/reportes/hoy', async () => reporteDeHoy(ctx.prisma))
}
