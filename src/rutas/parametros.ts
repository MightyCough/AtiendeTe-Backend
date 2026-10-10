export function enteroPositivo(valor: string): number | null {
  if (!/^\d+$/.test(valor)) return null
  const numero = Number(valor)
  if (!Number.isInteger(numero) || numero < 1) return null
  return numero
}
