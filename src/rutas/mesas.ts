import type { FastifyInstance } from 'fastify'
import type { Contexto } from '../contexto.js'
import { listarMesas, obtenerMesa } from '../servicios/mesas.js'
import { enteroPositivo } from './parametros.js'

export function registrarMesas(app: FastifyInstance, ctx: Contexto): void {
  app.get('/api/mesas', async () => listarMesas(ctx.prisma))

  app.get('/api/mesas/:numero', async (request, reply) => {
    const numero = enteroPositivo((request.params as { numero: string }).numero)
    if (numero === null) return reply.code(400).send({ error: 'Número de mesa inválido' })
    return obtenerMesa(ctx.prisma, numero)
  })
}
