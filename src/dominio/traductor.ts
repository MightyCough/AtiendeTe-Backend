// Las notas libres se guardan en el idioma del cliente y en español.
// Sin clave de Google, el traductor de paso copia el texto: la cocina igual lo ve.

import type { Idioma } from './idiomas.js'

export interface Traductor {
  traducirAlEspanol(texto: string, idiomaOrigen: Idioma): Promise<string>
}

export class TraductorDirecto implements Traductor {
  traducirAlEspanol(texto: string, _idiomaOrigen: Idioma): Promise<string> {
    return Promise.resolve(texto)
  }
}

type RespuestaGoogle = {
  data?: {
    translations?: { translatedText?: string }[]
  }
}

function decodificarHtml(texto: string): string {
  return texto
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
}

/**
 * Google Cloud Translation API v2.
 * Si la llamada falla, devuelve el texto original para no bloquear el pedido.
 */
export class TraductorGoogle implements Traductor {
  constructor(private readonly apiKey: string) {}

  async traducirAlEspanol(texto: string, idiomaOrigen: Idioma): Promise<string> {
    const limpio = texto.trim()
    if (!limpio || idiomaOrigen === 'es') return texto

    const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(this.apiKey)}`
    try {
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: limpio,
          source: idiomaOrigen,
          target: 'es',
          format: 'text',
        }),
        signal: AbortSignal.timeout(5000),
      })
      if (!respuesta.ok) {
        console.error(`Google Translate respondió ${respuesta.status}; se guarda la nota original`)
        return texto
      }
      const cuerpo = (await respuesta.json()) as RespuestaGoogle
      const traducido = cuerpo.data?.translations?.[0]?.translatedText
      if (!traducido) return texto
      return decodificarHtml(traducido)
    } catch (error) {
      console.error('No se pudo traducir la nota; se guarda el original', error)
      return texto
    }
  }
}

export function crearTraductor(apiKey: string | undefined): Traductor {
  const clave = apiKey?.trim()
  if (clave) return new TraductorGoogle(clave)
  return new TraductorDirecto()
}
