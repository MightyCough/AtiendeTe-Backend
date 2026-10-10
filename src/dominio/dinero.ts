// El total se calcula en céntimos para no arrastrar el error de los flotantes.
// Quitar ingredientes no cambia el precio: esta función ni siquiera los recibe.

export type LineaCalculo = {
  precio: number
  cantidad: number
  adicionales: { precioExtra: number }[]
}

function aCentavos(valor: number): number {
  return Math.round(valor * 100)
}

/** Convierte un Decimal de Prisma (o un número) a soles con dos decimales. */
export function aNumero(valor: { toString(): string } | number): number {
  return aCentavos(Number(valor)) / 100
}

/**
 * Total del pedido en soles.
 * Por línea: (precio del producto + suma de precios extra) × cantidad.
 */
export function calcularTotal(lineas: LineaCalculo[]): number {
  let centavos = 0
  for (const linea of lineas) {
    let unitario = aCentavos(linea.precio)
    for (const extra of linea.adicionales) {
      unitario += aCentavos(extra.precioExtra)
    }
    centavos += unitario * linea.cantidad
  }
  return centavos / 100
}
