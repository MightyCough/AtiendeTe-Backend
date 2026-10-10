import type { PedidoActualizadoDto, PedidoDto } from '../contrato.js'
import type { Contexto } from '../contexto.js'
import { aNumero, calcularTotal, type LineaCalculo } from '../dominio/dinero.js'
import { esEstadoPedido, transicionPermitida, type EstadoPedido } from '../dominio/estados.js'
import type { Idioma } from '../dominio/idiomas.js'
import { ErrorHttp } from '../errores.js'
import { publicarEstadoMesa } from '../mqtt.js'
import { cargarPedido, includePedido, pedidoADto } from './pedido-dto.js'

export type ItemEntrada = {
  productoId: number
  cantidad: number
  adicionales: number[]
  sinIngredientes: number[]
  nota?: string
}

export type PedidoEntrada = {
  mesa: number
  idioma: Idioma
  items: ItemEntrada[]
}

function unicos(ids: number[]): number[] {
  return [...new Set(ids)]
}

export async function crearPedido(ctx: Contexto, entrada: PedidoEntrada): Promise<PedidoDto> {
  const mesa = await ctx.prisma.mesa.findUnique({ where: { numero: entrada.mesa } })
  if (!mesa) throw new ErrorHttp(404, 'Mesa no encontrada')

  const idsProducto = [...new Set(entrada.items.map((item) => item.productoId))]
  const productos = await ctx.prisma.producto.findMany({
    where: { id: { in: idsProducto } },
    include: {
      adicionales: { include: { adicional: true } },
      ingredientes: true,
    },
  })
  const porId = new Map(productos.map((producto) => [producto.id, producto]))

  type LineaLista = {
    productoId: number
    cantidad: number
    precio: number
    notaOriginal: string | null
    extras: { id: number; precioExtra: number }[]
    sinIngredientes: number[]
  }

  const lineas: LineaLista[] = []
  for (const item of entrada.items) {
    const producto = porId.get(item.productoId)
    if (!producto) throw new ErrorHttp(400, `El producto ${item.productoId} no existe`)
    if (!producto.disponible) throw new ErrorHttp(400, `El producto ${item.productoId} no está disponible`)

    const extras: { id: number; precioExtra: number }[] = []
    for (const adicionalId of unicos(item.adicionales)) {
      const enlace = producto.adicionales.find((candidato) => candidato.adicionalId === adicionalId)
      if (!enlace) {
        throw new ErrorHttp(400, `El adicional ${adicionalId} no corresponde al producto ${producto.id}`)
      }
      extras.push({ id: enlace.adicional.id, precioExtra: aNumero(enlace.adicional.precioExtra) })
    }

    const sinIngredientes = unicos(item.sinIngredientes)
    for (const ingredienteId of sinIngredientes) {
      const permitido = producto.ingredientes.some((candidato) => candidato.ingredienteId === ingredienteId)
      if (!permitido) {
        throw new ErrorHttp(
          400,
          `El ingrediente ${ingredienteId} no se puede quitar del producto ${producto.id}`,
        )
      }
    }

    const nota = item.nota?.trim() ? item.nota.trim() : null
    lineas.push({
      productoId: producto.id,
      cantidad: item.cantidad,
      precio: aNumero(producto.precio),
      notaOriginal: nota,
      extras,
      sinIngredientes,
    })
  }

  const notasTraducidas = await Promise.all(
    lineas.map((linea) =>
      linea.notaOriginal
        ? ctx.traductor.traducirAlEspanol(linea.notaOriginal, entrada.idioma)
        : Promise.resolve(null),
    ),
  )

  const calculo: LineaCalculo[] = lineas.map((linea) => ({
    precio: linea.precio,
    cantidad: linea.cantidad,
    adicionales: linea.extras.map((extra) => ({ precioExtra: extra.precioExtra })),
  }))
  const total = calcularTotal(calculo)

  const pedidoId = await ctx.prisma.$transaction(async (tx) => {
    const creado = await tx.pedido.create({
      data: {
        mesaId: mesa.id,
        idioma: entrada.idioma,
        estado: 'RECIBIDO',
        total: total.toFixed(2),
        historial: { create: { estado: 'RECIBIDO' } },
        items: {
          create: lineas.map((linea, indice) => ({
            productoId: linea.productoId,
            cantidad: linea.cantidad,
            precioUnitario: linea.precio.toFixed(2),
            notaOriginal: linea.notaOriginal,
            notaEs: notasTraducidas[indice],
            adicionales: {
              create: linea.extras.map((extra) => ({
                adicionalId: extra.id,
                precioExtra: extra.precioExtra.toFixed(2),
              })),
            },
            sinIngredientes: {
              create: linea.sinIngredientes.map((ingredienteId) => ({ ingredienteId })),
            },
          })),
        },
      },
      select: { id: true },
    })
    return creado.id
  })

  const completo = await cargarPedido(ctx.prisma, pedidoId)
  if (!completo) throw new ErrorHttp(500, 'No se pudo leer el pedido recién creado')

  const paraCocina = pedidoADto(completo, 'es')
  const paraCliente = pedidoADto(completo, completo.idioma)

  ctx.io.emit('pedido:nuevo', paraCocina)
  publicarEstadoMesa(ctx.mqtt, mesa.numero, completo.id, 'RECIBIDO')
  ctx.log.info({ id: completo.id, mesa: mesa.numero, total }, 'Pedido creado')

  return paraCliente
}

export async function obtenerPedidoCliente(ctx: Contexto, id: number): Promise<PedidoDto> {
  const pedido = await cargarPedido(ctx.prisma, id)
  if (!pedido) throw new ErrorHttp(404, 'Pedido no encontrado')
  return pedidoADto(pedido, pedido.idioma)
}

export async function listarPedidosCocina(
  ctx: Contexto,
  filtros: { estado?: string; fecha?: { inicio: Date; fin: Date } },
): Promise<PedidoDto[]> {
  const pedidos = await ctx.prisma.pedido.findMany({
    where: {
      ...(filtros.estado && esEstadoPedido(filtros.estado) ? { estado: filtros.estado } : {}),
      ...(filtros.fecha ? { creadoEn: { gte: filtros.fecha.inicio, lt: filtros.fecha.fin } } : {}),
    },
    include: includePedido,
    orderBy: { creadoEn: 'asc' },
  })
  return pedidos.map((pedido) => pedidoADto(pedido, 'es'))
}

export async function cambiarEstado(
  ctx: Contexto,
  id: number,
  estado: EstadoPedido,
): Promise<PedidoActualizadoDto> {
  const pedido = await ctx.prisma.pedido.findUnique({
    where: { id },
    include: { mesa: true },
  })
  if (!pedido) throw new ErrorHttp(404, 'Pedido no encontrado')
  if (!esEstadoPedido(pedido.estado) || !transicionPermitida(pedido.estado, estado)) {
    throw new ErrorHttp(400, `No se puede pasar de ${pedido.estado} a ${estado}`)
  }

  await ctx.prisma.pedido.update({
    where: { id },
    data: {
      estado,
      historial: { create: { estado } },
    },
  })

  const aviso: PedidoActualizadoDto = { id, mesa: pedido.mesa.numero, estado }
  ctx.io.emit('pedido:actualizado', aviso)
  publicarEstadoMesa(ctx.mqtt, pedido.mesa.numero, id, estado)
  ctx.log.info(aviso, 'Estado de pedido actualizado')
  return aviso
}
