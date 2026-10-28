import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Contexto } from '../contexto.js'
import { ESTADOS_MESA } from '../dominio/estados-mesa.js'
import { cambiarEstadoMesa, listarMesas, obtenerMesa } from '../servicios/mesas.js'
import { enteroPositivo } from './parametros.js'

const esquemaEstado = z.object({
  estado: z.enum(ESTADOS_MESA),
})

export function registrarMesas(app: FastifyInstance, ctx: Contexto): void {
  app.get('/api/mesas', async () => listarMesas(ctx.prisma))

  app.get('/api/mesas/:numero', async (request, reply) => {
    const numero = enteroPositivo((request.params as { numero: string }).numero)
    if (numero === null) return reply.code(400).send({ error: 'Número de mesa inválido' })
    return obtenerMesa(ctx.prisma, numero)
  })

  app.patch('/api/mesas/:numero/estado', async (request, reply) => {
    const numero = enteroPositivo((request.params as { numero: string }).numero)
    if (numero === null) return reply.code(400).send({ error: 'Número de mesa inválido' })
    const parseado = esquemaEstado.safeParse(request.body)
    if (!parseado.success) {
      return reply.code(400).send({ error: 'Datos inválidos', detalles: parseado.error.issues })
    }
    return cambiarEstadoMesa(ctx, numero, parseado.data.estado)
  })
}
