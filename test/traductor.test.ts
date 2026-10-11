import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { TraductorDirecto, crearTraductor } from '../src/dominio/traductor.ts'

describe('traductor de notas', () => {
  it('sin clave de Google el texto pasa igual, en inglés y en español', async () => {
    const traductor = new TraductorDirecto()
    assert.equal(await traductor.traducirAlEspanol('no salt', 'en'), 'no salt')
    assert.equal(await traductor.traducirAlEspanol('sin sal', 'es'), 'sin sal')
  })

  it('una clave vacía también usa el traductor directo', () => {
    assert.ok(crearTraductor(undefined) instanceof TraductorDirecto)
    assert.ok(crearTraductor('   ') instanceof TraductorDirecto)
  })
})
