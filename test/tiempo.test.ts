import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { diaEnLima, esFechaIso, rangoDelDia } from '../src/dominio/tiempo.ts'

describe('día en America/Lima', () => {
  it('acepta una fecha de calendario y rechaza las imposibles', () => {
    assert.equal(esFechaIso('2026-10-10'), true)
    assert.equal(esFechaIso('2026-02-31'), false)
    assert.equal(esFechaIso('10-10-2026'), false)
    assert.equal(esFechaIso('2026-1-1'), false)
  })

  it('abre el día a las 00:00 de Lima, que son las 05:00 UTC', () => {
    const { inicio, fin } = rangoDelDia('2026-10-10')
    assert.equal(inicio.toISOString(), '2026-10-10T05:00:00.000Z')
    assert.equal(fin.toISOString(), '2026-10-11T05:00:00.000Z')
  })

  it('a las 02:30 UTC todavía es el día anterior en Huánuco', () => {
    assert.equal(diaEnLima(new Date('2026-10-11T02:30:00.000Z')), '2026-10-10')
    assert.equal(diaEnLima(new Date('2026-10-11T05:00:00.000Z')), '2026-10-11')
  })
})
