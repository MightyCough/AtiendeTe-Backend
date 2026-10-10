// Carga .env sin dependencia extra y expone la configuración del proceso.
// No pisa variables que ya vengan del entorno (útil en pruebas).

import { existsSync, readFileSync } from 'node:fs'

export function cargarEnv(ruta = '.env'): void {
  if (!existsSync(ruta)) return
  const texto = readFileSync(ruta, 'utf8')
  for (const linea of texto.split('\n')) {
    const limpia = linea.trim()
    if (!limpia || limpia.startsWith('#')) continue
    const igual = limpia.indexOf('=')
    if (igual === -1) continue
    const clave = limpia.slice(0, igual).trim()
    let valor = limpia.slice(igual + 1).trim()
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1)
    }
    if (process.env[clave] === undefined) {
      process.env[clave] = valor
    }
  }
}

export type Config = {
  databaseUrl: string
  mqttUrl: string
  host: string
  puerto: number
  googleTranslateApiKey: string | undefined
}

export function leerConfig(): Config {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('Falta DATABASE_URL. Copia .env.example a .env.')
  }

  const puerto = Number(process.env.PORT ?? 3000)
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    throw new Error('PORT inválido')
  }

  const clave = process.env.GOOGLE_TRANSLATE_API_KEY?.trim()

  return {
    databaseUrl,
    mqttUrl: process.env.MQTT_URL ?? 'mqtt://localhost:1883',
    host: process.env.HOST ?? '0.0.0.0',
    puerto,
    googleTranslateApiKey: clave ? clave : undefined,
  }
}
