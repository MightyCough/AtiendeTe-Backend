// La cocina avanza el pedido de uno en uno. No se salta ni se retrocede.

export const ESTADOS_PEDIDO = ['RECIBIDO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO'] as const

export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number]

export function esEstadoPedido(valor: string): valor is EstadoPedido {
  return (ESTADOS_PEDIDO as readonly string[]).includes(valor)
}

export function transicionPermitida(actual: EstadoPedido, siguiente: EstadoPedido): boolean {
  const indice = ESTADOS_PEDIDO.indexOf(actual)
  return ESTADOS_PEDIDO[indice + 1] === siguiente
}
