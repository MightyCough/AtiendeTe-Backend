import { Prisma, type PrismaClient } from '@prisma/client'
import type { PedidoDto } from '../contrato.js'
import { aNumero, calcularTotal } from '../dominio/dinero.js'
import type { EstadoPedido } from '../dominio/estados.js'
import { textoTraducido, type Idioma } from '../dominio/idiomas.js'

export const includePedido = {
  mesa: true,
  items: {
    orderBy: { id: 'asc' as const },
    include: {
      producto: { include: { traducciones: true } },
      adicionales: { include: { adicional: { include: { traducciones: true } } } },
      sinIngredientes: { include: { ingrediente: { include: { traducciones: true } } } },
    },
  },
} satisfies Prisma.PedidoInclude

export type PedidoCompleto = Prisma.PedidoGetPayload<{ include: typeof includePedido }>

export async function cargarPedido(prisma: PrismaClient, id: number): Promise<PedidoCompleto | null> {
  return prisma.pedido.findUnique({ where: { id }, include: includePedido })
}

/** Arma el pedido para el cliente (idioma del pedido) o para la cocina (siempre español). */
export function pedidoADto(pedido: PedidoCompleto, idioma: Idioma): PedidoDto {
  const items = pedido.items.map((item) => {
    const adicionales = item.adicionales.map((enlace) => ({
      id: enlace.adicional.id,
      nombre: textoTraducido(enlace.adicional.traducciones, idioma, 'nombre'),
      precioExtra: aNumero(enlace.precioExtra),
    }))
    const subtotal = calcularTotal([
      {
        precio: aNumero(item.precioUnitario),
        cantidad: item.cantidad,
        adicionales,
      },
    ])
    return {
      id: item.id,
      productoId: item.productoId,
      nombre: textoTraducido(item.producto.traducciones, idioma, 'nombre'),
      cantidad: item.cantidad,
      precioUnitario: aNumero(item.precioUnitario),
      subtotal,
      nota: item.notaOriginal,
      notaEs: item.notaEs,
      adicionales,
      sinIngredientes: item.sinIngredientes.map((enlace) => ({
        id: enlace.ingrediente.id,
        nombre: textoTraducido(enlace.ingrediente.traducciones, idioma, 'nombre'),
      })),
    }
  })

  return {
    id: pedido.id,
    mesa: pedido.mesa.numero,
    idioma: pedido.idioma,
    estado: pedido.estado as EstadoPedido,
    total: aNumero(pedido.total),
    creadoEn: pedido.creadoEn.toISOString(),
    actualizadoEn: pedido.actualizadoEn.toISOString(),
    items,
  }
}
