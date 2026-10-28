import type { PrismaClient } from '@prisma/client'
import type { Contexto } from '../contexto.js'
import type { MesaDto, MesaEstadoDto } from '../contrato.js'
import type { EstadoMesa } from '../dominio/estados-mesa.js'
import { ErrorHttp } from '../errores.js'
import { publicarOcupacionMesa } from '../mqtt.js'

function aDto(mesa: {
  numero: number
  online: boolean
  ultimaConexion: Date | null
  estado: EstadoMesa
}): MesaDto {
  return {
    numero: mesa.numero,
    online: mesa.online,
    ultimaConexion: mesa.ultimaConexion ? mesa.ultimaConexion.toISOString() : null,
    estado: mesa.estado,
  }
}

export async function listarMesas(prisma: PrismaClient): Promise<MesaDto[]> {
  const mesas = await prisma.mesa.findMany({ orderBy: { numero: 'asc' } })
  return mesas.map(aDto)
}

export async function obtenerMesa(prisma: PrismaClient, numero: number): Promise<MesaDto> {
  const mesa = await prisma.mesa.findUnique({ where: { numero } })
  if (!mesa) throw new ErrorHttp(404, 'Mesa no encontrada')
  return aDto(mesa)
}

/**
 * El ESP32 publica "online" al conectar y Mosquitto entrega "offline" con el Last Will.
 * ultimaConexion se actualiza solo al recibir online: es la última vez que la mesa avisó que estaba viva.
 */
export async function registrarConexion(
  prisma: PrismaClient,
  numero: number,
  online: boolean,
): Promise<MesaDto | null> {
  const mesa = await prisma.mesa.findUnique({ where: { numero } })
  if (!mesa) return null
  const actualizada = await prisma.mesa.update({
    where: { numero },
    data: {
      online,
      ...(online ? { ultimaConexion: new Date() } : {}),
    },
  })
  return aDto(actualizada)
}

/** Avisa a las pantallas (Socket.IO) y al LED de la mesa (MQTT) del estado actual. */
export function anunciarEstadoMesa(ctx: Contexto, numero: number, estado: EstadoMesa): MesaEstadoDto {
  const aviso: MesaEstadoDto = { numero, estado }
  ctx.io.emit('mesa:estado', aviso)
  publicarOcupacionMesa(ctx.mqtt, numero, estado)
  ctx.log.info(aviso, 'Estado de mesa actualizado')
  return aviso
}

/** La caja o el administrador fijan el estado de la mesa. Repetir el mismo estado vuelve a avisar al LED. */
export async function cambiarEstadoMesa(
  ctx: Contexto,
  numero: number,
  estado: EstadoMesa,
): Promise<MesaEstadoDto> {
  const mesa = await ctx.prisma.mesa.findUnique({ where: { numero } })
  if (!mesa) throw new ErrorHttp(404, 'Mesa no encontrada')
  await ctx.prisma.mesa.update({ where: { numero }, data: { estado } })
  return anunciarEstadoMesa(ctx, numero, estado)
}
