import type { PrismaClient } from '@prisma/client'
import type { CategoriaMenu } from '../contrato.js'
import { aNumero } from '../dominio/dinero.js'
import { textoTraducido, type Idioma } from '../dominio/idiomas.js'

export async function obtenerMenu(prisma: PrismaClient, idioma: Idioma): Promise<CategoriaMenu[]> {
  const categorias = await prisma.categoria.findMany({
    orderBy: { orden: 'asc' },
    include: {
      traducciones: true,
      productos: {
        orderBy: { orden: 'asc' },
        include: {
          traducciones: true,
          adicionales: {
            include: { adicional: { include: { traducciones: true } } },
          },
          ingredientes: {
            include: { ingrediente: { include: { traducciones: true } } },
          },
        },
      },
    },
  })

  return categorias.map((categoria) => ({
    id: categoria.id,
    nombre: textoTraducido(categoria.traducciones, idioma, 'nombre'),
    productos: categoria.productos.map((producto) => ({
      id: producto.id,
      nombre: textoTraducido(producto.traducciones, idioma, 'nombre'),
      descripcion: textoTraducido(producto.traducciones, idioma, 'descripcion'),
      precio: aNumero(producto.precio),
      imagenUrl: producto.imagenUrl,
      disponible: producto.disponible,
      adicionales: producto.adicionales
        .map((enlace) => ({
          id: enlace.adicional.id,
          nombre: textoTraducido(enlace.adicional.traducciones, idioma, 'nombre'),
          precioExtra: aNumero(enlace.adicional.precioExtra),
        }))
        .sort((a, b) => a.id - b.id),
      ingredientes: producto.ingredientes
        .map((enlace) => ({
          id: enlace.ingrediente.id,
          nombre: textoTraducido(enlace.ingrediente.traducciones, idioma, 'nombre'),
        }))
        .sort((a, b) => a.id - b.id),
    })),
  }))
}
