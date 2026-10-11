import type { PrismaClient } from '@prisma/client'
import type { MesaDto } from '../contrato.js'
import { ErrorHttp } from '../errores.js'

function aDto(mesa: { numero: number; online: boolean; ultimaConexion: Date | null }): MesaDto {
  return {
    numero: mesa.numero,
    online: mesa.online,
    ultimaConexion: mesa.ultimaConexion ? mesa.ultimaConexion.toISOString() : null,
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
