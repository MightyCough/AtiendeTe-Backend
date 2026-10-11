// Formas JSON que consumen el menú del celular y la pantalla de cocina.
// El README repite este contrato para el frontend, que vive en otro repositorio.

import type { EstadoPedido } from './dominio/estados.js'
import type { Idioma } from './dominio/idiomas.js'

export type AdicionalMenu = {
  id: number
  nombre: string
  precioExtra: number
}

export type IngredienteMenu = {
  id: number
  nombre: string
}

export type ProductoMenu = {
  id: number
  nombre: string
  descripcion: string
  precio: number
  imagenUrl: string | null
  disponible: boolean
  adicionales: AdicionalMenu[]
  ingredientes: IngredienteMenu[]
}

export type CategoriaMenu = {
  id: number
  nombre: string
  productos: ProductoMenu[]
}

export type MesaDto = {
  numero: number
  online: boolean
  ultimaConexion: string | null
}

export type ItemPedidoDto = {
  id: number
  productoId: number
  nombre: string
  cantidad: number
  precioUnitario: number
  subtotal: number
  nota: string | null
  notaEs: string | null
  adicionales: AdicionalMenu[]
  sinIngredientes: IngredienteMenu[]
}

export type PedidoDto = {
  id: number
  mesa: number
  idioma: Idioma
  estado: EstadoPedido
  total: number
  creadoEn: string
  actualizadoEn: string
  items: ItemPedidoDto[]
}

export type PedidoActualizadoDto = {
  id: number
  mesa: number
  estado: EstadoPedido
}

export type MesaConexionDto = {
  numero: number
  online: boolean
}

export type TopProductoDto = {
  productoId: number
  nombre: string
  cantidad: number
  total: number
}

export type ReporteHoyDto = {
  pedidos: number
  totalVendido: number
  topProductos: TopProductoDto[]
}
