import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Contexto } from '../contexto.js'
import { esEstadoPedido } from '../dominio/estados.js'
import { esFechaIso, rangoDelDia } from '../dominio/tiempo.js'
import { cambiarEstado, crearPedido, listarPedidosCocina, obtenerPedidoCliente } from '../servicios/pedidos.js'
import { enteroPositivo } from './parametros.js'

const esquemaItem = z.object({
  productoId: z.number({ invalid_type_error: 'productoId debe ser un número' }).int().positive(),
  cantidad: z
    .number({ invalid_type_error: 'cantidad debe ser un número' })
    .int()
    .positive('cantidad debe ser al menos 1'),
  adicionales: z.array(z.number().int().positive()).optional().default([]),
  sinIngredientes: z.array(z.number().int().positive()).optional().default([]),
  nota: z.string().trim().max(300, 'la nota admite hasta 300 caracteres').optional(),
})

const esquemaCrear = z.object({
  mesa: z.number({ invalid_type_error: 'mesa debe ser un número' }).int().positive(),
  idioma: z.enum(['es', 'en']),
  items: z.array(esquemaItem).min(1, 'el pedido necesita al menos un producto'),
})

const esquemaEstado = z.object({
  estado: z.enum(['RECIBIDO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO']),
})

export function registrarPedidos(app: FastifyInstance, ctx: Contexto): void {
  app.post('/api/pedidos', async (request, reply) => {
    const parseado = esquemaCrear.safeParse(request.body)
    if (!parseado.success) {
      return reply.code(400).send({ error: 'Datos inválidos', detalles: parseado.error.issues })
    }
    const pedido = await crearPedido(ctx, parseado.data)
    return reply.code(201).send(pedido)
  })

  app.get('/api/pedidos/:id', async (request, reply) => {
    const id = enteroPositivo((request.params as { id: string }).id)
    if (id === null) return reply.code(400).send({ error: 'Id de pedido inválido' })
    return obtenerPedidoCliente(ctx, id)
  })

  app.get('/api/pedidos', async (request, reply) => {
    const consulta = request.query as { estado?: unknown; fecha?: unknown }
    const estado = typeof consulta.estado === 'string' ? consulta.estado : ''
    const fecha = typeof consulta.fecha === 'string' ? consulta.fecha : ''

    if (estado && !esEstadoPedido(estado)) {
      return reply.code(400).send({ error: 'Estado inválido' })
    }
    if (fecha && !esFechaIso(fecha)) {
      return reply.code(400).send({ error: 'Fecha inválida, use YYYY-MM-DD' })
    }

    return listarPedidosCocina(ctx, {
      estado: estado || undefined,
      fecha: fecha ? rangoDelDia(fecha) : undefined,
    })
  })

  app.patch('/api/pedidos/:id/estado', async (request, reply) => {
    const id = enteroPositivo((request.params as { id: string }).id)
    if (id === null) return reply.code(400).send({ error: 'Id de pedido inválido' })
    const parseado = esquemaEstado.safeParse(request.body)
    if (!parseado.success) {
      return reply.code(400).send({ error: 'Datos inválidos', detalles: parseado.error.issues })
    }
    return cambiarEstado(ctx, id, parseado.data.estado)
  })
}
