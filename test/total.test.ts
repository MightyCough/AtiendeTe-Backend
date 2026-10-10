import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calcularTotal } from '../src/dominio/dinero.ts'

describe('calcularTotal', () => {
  it('suma el precio del producto por la cantidad', () => {
    assert.equal(calcularTotal([{ precio: 18, cantidad: 2, adicionales: [] }]), 36)
  })

  it('suma los adicionales sobre el precio unitario y luego multiplica', () => {
    // Hamburguesa clásica 14 + queso 2 + huevo 2.50, dos veces.
    const total = calcularTotal([
      {
        precio: 14,
        cantidad: 2,
        adicionales: [{ precioExtra: 2 }, { precioExtra: 2.5 }],
      },
    ])
    assert.equal(total, 37)
  })

  it('acumula varias líneas', () => {
    const total = calcularTotal([
      { precio: 18, cantidad: 1, adicionales: [{ precioExtra: 4 }] },
      { precio: 5, cantidad: 2, adicionales: [] },
    ])
    assert.equal(total, 32)
  })

  it('redondea en céntimos (0.10 + 0.20 no se arrastra)', () => {
    const total = calcularTotal([
      { precio: 0.1, cantidad: 1, adicionales: [{ precioExtra: 0.2 }] },
    ])
    assert.equal(total, 0.3)
  })

  it('un pedido sin líneas vale 0', () => {
    assert.equal(calcularTotal([]), 0)
  })

  it('quitar ingredientes no entra al cálculo: el precio no baja', () => {
    const conTodo = calcularTotal([{ precio: 14, cantidad: 1, adicionales: [] }])
    const sinCebolla = calcularTotal([{ precio: 14, cantidad: 1, adicionales: [] }])
    assert.equal(sinCebolla, conTodo)
  })
})
