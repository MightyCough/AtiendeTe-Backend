import type { FastifyInstance } from 'fastify'
import type { Contexto } from '../contexto.js'
import { esIdioma } from '../dominio/idiomas.js'
import { obtenerMenu } from '../servicios/menu.js'

export function registrarMenu(app: FastifyInstance, ctx: Contexto): void {
  app.get('/api/menu', async (request, reply) => {
    const consulta = request.query as { lang?: unknown }
    const lang = typeof consulta.lang === 'string' && consulta.lang.length > 0 ? consulta.lang : 'es'
    if (!esIdioma(lang)) {
      return reply.code(400).send({ error: 'lang debe ser es o en' })
    }
    return obtenerMenu(ctx.prisma, lang)
  })
}
