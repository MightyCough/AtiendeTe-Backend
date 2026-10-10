import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { leerConexion } from '../src/mqtt.ts'

describe('mensaje de conexión MQTT', () => {
  it('lee online y offline del tópico de la mesa', () => {
    assert.deepEqual(leerConexion('atiendete/mesa/1/conexion', Buffer.from('online')), {
      numero: 1,
      online: true,
    })
    assert.deepEqual(leerConexion('atiendete/mesa/12/conexion', Buffer.from(' offline \n')), {
      numero: 12,
      online: false,
    })
  })

  it('ignora tópicos y textos que no son el contrato', () => {
    assert.equal(leerConexion('atiendete/mesa/1/estado', Buffer.from('online')), null)
    assert.equal(leerConexion('atiendete/mesa/1/conexion', Buffer.from('{"online":true}')), null)
    assert.equal(leerConexion('atiendete/mesa/x/conexion', Buffer.from('online')), null)
  })
})
