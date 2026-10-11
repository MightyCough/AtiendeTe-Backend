import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ESTADOS_PEDIDO, esEstadoPedido, transicionPermitida, type EstadoPedido } from '../src/dominio/estados.ts'

describe('transiciones de estado', () => {
  it('sigue la cadena de la cocina', () => {
    const cadena: EstadoPedido[] = ['RECIBIDO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO']
    assert.deepEqual(ESTADOS_PEDIDO, cadena)
    for (let i = 0; i < cadena.length - 1; i += 1) {
      assert.equal(transicionPermitida(cadena[i], cadena[i + 1]), true)
    }
  })

  it('rechaza saltos, retrocesos, repetir el estado y salir de ENTREGADO', () => {
    assert.equal(transicionPermitida('RECIBIDO', 'LISTO'), false)
    assert.equal(transicionPermitida('RECIBIDO', 'ENTREGADO'), false)
    assert.equal(transicionPermitida('EN_PREPARACION', 'RECIBIDO'), false)
    assert.equal(transicionPermitida('LISTO', 'EN_PREPARACION'), false)
    assert.equal(transicionPermitida('ENTREGADO', 'LISTO'), false)
    assert.equal(transicionPermitida('RECIBIDO', 'RECIBIDO'), false)
    assert.equal(transicionPermitida('ENTREGADO', 'RECIBIDO'), false)
    assert.equal(transicionPermitida('ENTREGADO', 'ENTREGADO'), false)
  })

  it('reconoce solo los cuatro estados en mayúsculas', () => {
    for (const estado of ESTADOS_PEDIDO) {
      assert.equal(esEstadoPedido(estado), true)
    }
    assert.equal(esEstadoPedido('listo'), false)
    assert.equal(esEstadoPedido('LISTA'), false)
    assert.equal(esEstadoPedido(''), false)
  })
})
