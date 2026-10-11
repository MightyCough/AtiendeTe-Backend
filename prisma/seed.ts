// Siembra el menú de comida rápida peruana (soles) y las mesas 1 a 3.
// Vuelve a correr este script borra pedidos y reinicia los id. Ver el README.

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const adicionales = [
  { clave: 'queso', precio: '2.00', es: 'Queso', en: 'Cheese' },
  { clave: 'huevo', precio: '2.50', es: 'Huevo frito', en: 'Fried egg' },
  { clave: 'tocino', precio: '3.50', es: 'Tocino', en: 'Bacon' },
  { clave: 'papas', precio: '4.00', es: 'Papas extra', en: 'Extra fries' },
  { clave: 'crema', precio: '1.50', es: 'Crema de rocoto', en: 'Rocoto cream' },
  { clave: 'aji', precio: '1.00', es: 'Ají casero', en: 'House chili' },
] as const

const ingredientes = [
  { clave: 'lechuga', es: 'Lechuga', en: 'Lettuce' },
  { clave: 'tomate', es: 'Tomate', en: 'Tomato' },
  { clave: 'cebolla', es: 'Cebolla', en: 'Onion' },
  { clave: 'mayonesa', es: 'Mayonesa', en: 'Mayonnaise' },
  { clave: 'ketchup', es: 'Kétchup', en: 'Ketchup' },
  { clave: 'mostaza', es: 'Mostaza', en: 'Mustard' },
  { clave: 'ensalada', es: 'Ensalada', en: 'Salad' },
] as const

type ClaveAdicional = (typeof adicionales)[number]['clave']
type ClaveIngrediente = (typeof ingredientes)[number]['clave']

type ProductoSeed = {
  precio: string
  es: string
  en: string
  descripcionEs: string
  descripcionEn: string
  adicionales: readonly ClaveAdicional[]
  ingredientes: readonly ClaveIngrediente[]
}

type CategoriaSeed = {
  es: string
  en: string
  productos: readonly ProductoSeed[]
}

const menu: readonly CategoriaSeed[] = [
  {
    es: 'Pollo broaster',
    en: 'Broaster chicken',
    productos: [
      {
        precio: '18.00',
        es: 'Cuarto de pollo broaster',
        en: 'Quarter broaster chicken',
        descripcionEs: 'Pierna y muslo crocantes, con papas fritas y ensalada fresca.',
        descripcionEn: 'Crispy leg and thigh, with fries and fresh salad.',
        adicionales: ['papas', 'crema', 'aji'],
        ingredientes: ['ensalada'],
      },
      {
        precio: '32.00',
        es: 'Medio pollo broaster',
        en: 'Half broaster chicken',
        descripcionEs: 'Medio pollo crocante, con papas fritas y ensalada fresca.',
        descripcionEn: 'Half crispy chicken, with fries and fresh salad.',
        adicionales: ['papas', 'crema', 'aji'],
        ingredientes: ['ensalada'],
      },
      {
        precio: '16.00',
        es: 'Alitas broaster (6)',
        en: 'Broaster wings (6)',
        descripcionEs: 'Seis alitas crocantes servidas con papas fritas.',
        descripcionEn: 'Six crispy wings served with fries.',
        adicionales: ['papas', 'crema', 'aji'],
        ingredientes: [],
      },
    ],
  },
  {
    es: 'Hamburguesas',
    en: 'Burgers',
    productos: [
      {
        precio: '14.00',
        es: 'Hamburguesa clásica',
        en: 'Classic burger',
        descripcionEs: 'Carne de res a la plancha, pan brioche, vegetales y salsas, con papas fritas.',
        descripcionEn: 'Grilled beef, brioche bun, vegetables and sauces, with fries.',
        adicionales: ['queso', 'huevo', 'tocino', 'papas'],
        ingredientes: ['lechuga', 'tomate', 'cebolla', 'mayonesa', 'ketchup', 'mostaza'],
      },
      {
        precio: '20.00',
        es: 'Hamburguesa royal',
        en: 'Royal burger',
        descripcionEs: 'Doble carne, queso fundido y tocino, con papas fritas.',
        descripcionEn: 'Double beef, melted cheese and bacon, with fries.',
        adicionales: ['queso', 'huevo', 'tocino', 'papas'],
        ingredientes: ['lechuga', 'tomate', 'cebolla', 'mayonesa', 'ketchup'],
      },
      {
        precio: '16.00',
        es: 'Hamburguesa de pollo',
        en: 'Chicken burger',
        descripcionEs: 'Filete de pollo crocante, lechuga y mayonesa, con papas fritas.',
        descripcionEn: 'Crispy chicken fillet, lettuce and mayonnaise, with fries.',
        adicionales: ['queso', 'papas'],
        ingredientes: ['lechuga', 'tomate', 'mayonesa'],
      },
    ],
  },
  {
    es: 'Salchipapas',
    en: 'Salchipapas',
    productos: [
      {
        precio: '12.00',
        es: 'Salchipapa clásica',
        en: 'Classic salchipapa',
        descripcionEs: 'Papas fritas con salchicha en tiras y salsas de la casa.',
        descripcionEn: 'Fries with sliced sausage and house sauces.',
        adicionales: ['queso', 'huevo', 'tocino'],
        ingredientes: ['mayonesa', 'ketchup', 'mostaza'],
      },
      {
        precio: '18.00',
        es: 'Salchipapa broaster',
        en: 'Broaster salchipapa',
        descripcionEs: 'Papas fritas con trozos de pollo broaster y salsas.',
        descripcionEn: 'Fries with broaster chicken pieces and sauces.',
        adicionales: ['queso', 'huevo', 'crema'],
        ingredientes: ['mayonesa', 'ketchup'],
      },
      {
        precio: '22.00',
        es: 'Salchipapa royal',
        en: 'Royal salchipapa',
        descripcionEs: 'Papas fritas con salchicha, pollo broaster, huevo y queso.',
        descripcionEn: 'Fries with sausage, broaster chicken, egg and cheese.',
        adicionales: ['tocino', 'papas'],
        ingredientes: ['mayonesa', 'ketchup', 'mostaza'],
      },
    ],
  },
  {
    es: 'Bebidas',
    en: 'Drinks',
    productos: [
      {
        precio: '5.00',
        es: 'Inca Kola 500 ml',
        en: 'Inca Kola 500 ml',
        descripcionEs: 'La gaseosa dorada del Perú, bien fría.',
        descripcionEn: "Peru's golden soda, served cold.",
        adicionales: [],
        ingredientes: [],
      },
      {
        precio: '4.50',
        es: 'Chicha morada',
        en: 'Purple corn drink',
        descripcionEs: 'Vaso de chicha morada con limón y especias.',
        descripcionEn: 'Glass of purple corn drink with lime and spices.',
        adicionales: [],
        ingredientes: [],
      },
      {
        precio: '7.00',
        es: 'Limonada frozen',
        en: 'Frozen lemonade',
        descripcionEs: 'Limonada helada, espesa y un poco ácida.',
        descripcionEn: 'Icy, thick and slightly tart lemonade.',
        adicionales: [],
        ingredientes: [],
      },
      {
        precio: '3.00',
        es: 'Agua mineral',
        en: 'Mineral water',
        descripcionEs: 'Botella de agua sin gas, 625 ml.',
        descripcionEn: 'Still water bottle, 625 ml.',
        adicionales: [],
        ingredientes: [],
      },
    ],
  },
  {
    es: 'Postres',
    en: 'Desserts',
    productos: [
      {
        precio: '6.00',
        es: 'Mazamorra morada',
        en: 'Purple corn pudding',
        descripcionEs: 'Postre de maíz morado con frutas y canela.',
        descripcionEn: 'Purple corn pudding with fruit and cinnamon.',
        adicionales: [],
        ingredientes: [],
      },
      {
        precio: '6.00',
        es: 'Arroz con leche',
        en: 'Rice pudding',
        descripcionEs: 'Arroz con leche, canela y clavo de olor.',
        descripcionEn: 'Rice pudding with cinnamon and clove.',
        adicionales: [],
        ingredientes: [],
      },
      {
        precio: '8.00',
        es: 'Suspiro a la limeña',
        en: 'Lima sigh',
        descripcionEs: 'Manjarblanco con merengue de oporto.',
        descripcionEn: 'Dulce de leche custard topped with port meringue.',
        adicionales: [],
        ingredientes: [],
      },
    ],
  },
]

async function main(): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      // RESTART IDENTITY deja los id del README estables cada vez que se siembra.
      await tx.$executeRawUnsafe(`
        TRUNCATE TABLE
          pedido_estado_historial,
          pedido_item_ingredientes,
          pedido_item_adicionales,
          pedido_items,
          pedidos,
          producto_ingredientes,
          producto_adicionales,
          producto_traducciones,
          productos,
          ingrediente_traducciones,
          ingredientes,
          adicional_traducciones,
          adicionales,
          categoria_traducciones,
          categorias,
          mesas
        RESTART IDENTITY CASCADE
      `)

      const idAdicional = new Map<ClaveAdicional, number>()
      for (const adicional of adicionales) {
        const creado = await tx.adicional.create({
          data: {
            precioExtra: adicional.precio,
            traducciones: {
              create: [
                { idioma: 'es', nombre: adicional.es },
                { idioma: 'en', nombre: adicional.en },
              ],
            },
          },
        })
        idAdicional.set(adicional.clave, creado.id)
      }

      const idIngrediente = new Map<ClaveIngrediente, number>()
      for (const ingrediente of ingredientes) {
        const creado = await tx.ingrediente.create({
          data: {
            traducciones: {
              create: [
                { idioma: 'es', nombre: ingrediente.es },
                { idioma: 'en', nombre: ingrediente.en },
              ],
            },
          },
        })
        idIngrediente.set(ingrediente.clave, creado.id)
      }

      for (const [indiceCategoria, categoria] of menu.entries()) {
        await tx.categoria.create({
          data: {
            orden: indiceCategoria + 1,
            traducciones: {
              create: [
                { idioma: 'es', nombre: categoria.es },
                { idioma: 'en', nombre: categoria.en },
              ],
            },
            productos: {
              create: categoria.productos.map((producto, indiceProducto) => ({
                precio: producto.precio,
                imagenUrl: null,
                disponible: true,
                orden: indiceProducto + 1,
                traducciones: {
                  create: [
                    { idioma: 'es' as const, nombre: producto.es, descripcion: producto.descripcionEs },
                    { idioma: 'en' as const, nombre: producto.en, descripcion: producto.descripcionEn },
                  ],
                },
                adicionales: {
                  create: producto.adicionales.map((clave) => ({
                    adicionalId: idAdicional.get(clave)!,
                  })),
                },
                ingredientes: {
                  create: producto.ingredientes.map((clave) => ({
                    ingredienteId: idIngrediente.get(clave)!,
                  })),
                },
              })),
            },
          },
        })
      }

      await tx.mesa.createMany({
        data: [{ numero: 1 }, { numero: 2 }, { numero: 3 }],
      })
    },
    { timeout: 30_000 },
  )

  const [categorias, productos, mesas] = await Promise.all([
    prisma.categoria.count(),
    prisma.producto.count(),
    prisma.mesa.count(),
  ])
  console.log(`Semilla lista: ${categorias} categorías, ${productos} productos, ${mesas} mesas.`)
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
