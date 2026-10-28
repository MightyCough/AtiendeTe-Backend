// La caja o el administrador deciden cómo está la mesa. Cualquier cambio entre estados es válido.

export const ESTADOS_MESA = ['LIBRE', 'OCUPADA', 'RESERVADA'] as const

export type EstadoMesa = (typeof ESTADOS_MESA)[number]

export function esEstadoMesa(valor: string): valor is EstadoMesa {
  return (ESTADOS_MESA as readonly string[]).includes(valor)
}
