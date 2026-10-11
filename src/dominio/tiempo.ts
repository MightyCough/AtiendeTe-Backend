// Huánuco usa la hora de Perú (America/Lima, UTC−5, sin horario de verano).
// "Hoy" del reporte y el filtro fecha= se interpretan en ese huso, no en UTC.

const ZONA = 'America/Lima'

const FORMATO = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function esFechaIso(valor: string): boolean {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)
  if (!coincidencia) return false
  const anio = Number(coincidencia[1])
  const mes = Number(coincidencia[2])
  const dia = Number(coincidencia[3])
  const prueba = new Date(Date.UTC(anio, mes - 1, dia))
  return (
    prueba.getUTCFullYear() === anio &&
    prueba.getUTCMonth() === mes - 1 &&
    prueba.getUTCDate() === dia
  )
}

/** YYYY-MM-DD del instante dado, visto desde Lima. */
export function diaEnLima(fecha: Date = new Date()): string {
  const partes = FORMATO.formatToParts(fecha)
  const tomar = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? ''
  return `${tomar('year')}-${tomar('month')}-${tomar('day')}`
}

/** Inicio inclusive y fin exclusivo del día civil en Lima. */
export function rangoDelDia(isoDia: string): { inicio: Date; fin: Date } {
  if (!esFechaIso(isoDia)) {
    throw new Error(`Fecha inválida: ${isoDia}`)
  }
  const inicio = new Date(`${isoDia}T00:00:00-05:00`)
  const fin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000)
  return { inicio, fin }
}

export function rangoDeHoy(): { inicio: Date; fin: Date } {
  return rangoDelDia(diaEnLima(new Date()))
}
