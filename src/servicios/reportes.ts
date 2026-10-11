import type { PrismaClient } from '@prisma/client'
import type { ReporteHoyDto, TopProductoDto } from '../contrato.js'
import { aNumero, calcularTotal } from '../dominio/dinero.js'
import { textoTraducido } from '../dominio/idiomas.js'
import { rangoDeHoy } from '../dominio/tiempo.js'

const TOPE = 5

export async function reporteDeHoy(prisma: PrismaClient): Promise<ReporteHoyDto> {
  const { inicio, fin } = rangoDeHoy()
  const pedidos = await prisma.pedido.findMany({
    where: { creadoEn: { gte: inicio, lt: fin } },
    include: {
      items: {
        include: {
          producto: { include: { traducciones: true } },
          adicionales: true,
        },
      },
    },
  })

  let centavos = 0
  const acumulado = new Map<number, TopProductoDto>()

  for (const pedido of pedidos) {
    centavos += Math.round(aNumero(pedido.total) * 100)
    for (const item of pedido.items) {
      const subtotal = calcularTotal([
        {
          precio: aNumero(item.precioUnitario),
          cantidad: item.cantidad,
          adicionales: item.adicionales.map((extra) => ({ precioExtra: aNumero(extra.precioExtra) })),
        },
      ])
      const previo = acumulado.get(item.productoId)
      if (previo) {
        previo.cantidad += item.cantidad
        previo.total = aNumero(previo.total + subtotal)
      } else {
        acumulado.set(item.productoId, {
          productoId: item.productoId,
          nombre: textoTraducido(item.producto.traducciones, 'es', 'nombre'),
          cantidad: item.cantidad,
          total: subtotal,
        })
      }
    }
  }

  const topProductos = [...acumulado.values()]
    .sort((a, b) => b.cantidad - a.cantidad || b.total - a.total || a.productoId - b.productoId)
    .slice(0, TOPE)

  return {
    pedidos: pedidos.length,
    totalVendido: centavos / 100,
    topProductos,
  }
}
