export const IDIOMAS = ['es', 'en'] as const

export type Idioma = (typeof IDIOMAS)[number]

export function esIdioma(valor: string): valor is Idioma {
  return valor === 'es' || valor === 'en'
}

type FilaTraduccion = {
  idioma: string
  nombre: string
  descripcion?: string
}

/**
 * Elige la fila del idioma pedido. Si no existe, usa español.
 */
export function textoTraducido(
  filas: FilaTraduccion[],
  idioma: string,
  campo: 'nombre' | 'descripcion',
): string {
  const preferida = filas.find((fila) => fila.idioma === idioma) ?? filas.find((fila) => fila.idioma === 'es')
  if (!preferida) return ''
  return preferida[campo] ?? ''
}
