-- CreateEnum
CREATE TYPE "Idioma" AS ENUM ('es', 'en');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('RECIBIDO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO');

-- CreateTable
CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria_traducciones" (
    "id" SERIAL NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "idioma" "Idioma" NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "categoria_traducciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" SERIAL NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "imagenUrl" TEXT,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_traducciones" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "idioma" "Idioma" NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "producto_traducciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adicionales" (
    "id" SERIAL NOT NULL,
    "precioExtra" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "adicionales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adicional_traducciones" (
    "id" SERIAL NOT NULL,
    "adicionalId" INTEGER NOT NULL,
    "idioma" "Idioma" NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "adicional_traducciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredientes" (
    "id" SERIAL NOT NULL,

    CONSTRAINT "ingredientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingrediente_traducciones" (
    "id" SERIAL NOT NULL,
    "ingredienteId" INTEGER NOT NULL,
    "idioma" "Idioma" NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "ingrediente_traducciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_adicionales" (
    "productoId" INTEGER NOT NULL,
    "adicionalId" INTEGER NOT NULL,

    CONSTRAINT "producto_adicionales_pkey" PRIMARY KEY ("productoId","adicionalId")
);

-- CreateTable
CREATE TABLE "producto_ingredientes" (
    "productoId" INTEGER NOT NULL,
    "ingredienteId" INTEGER NOT NULL,

    CONSTRAINT "producto_ingredientes_pkey" PRIMARY KEY ("productoId","ingredienteId")
);

-- CreateTable
CREATE TABLE "mesas" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "online" BOOLEAN NOT NULL DEFAULT false,
    "ultimaConexion" TIMESTAMP(3),

    CONSTRAINT "mesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" SERIAL NOT NULL,
    "mesaId" INTEGER NOT NULL,
    "idioma" "Idioma" NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'RECIBIDO',
    "total" DECIMAL(10,2) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_items" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(10,2) NOT NULL,
    "notaOriginal" TEXT,
    "notaEs" TEXT,

    CONSTRAINT "pedido_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_item_adicionales" (
    "pedidoItemId" INTEGER NOT NULL,
    "adicionalId" INTEGER NOT NULL,
    "precioExtra" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "pedido_item_adicionales_pkey" PRIMARY KEY ("pedidoItemId","adicionalId")
);

-- CreateTable
CREATE TABLE "pedido_item_ingredientes" (
    "pedidoItemId" INTEGER NOT NULL,
    "ingredienteId" INTEGER NOT NULL,

    CONSTRAINT "pedido_item_ingredientes_pkey" PRIMARY KEY ("pedidoItemId","ingredienteId")
);

-- CreateTable
CREATE TABLE "pedido_estado_historial" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "estado" "EstadoPedido" NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pedido_estado_historial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categoria_traducciones_categoriaId_idioma_key" ON "categoria_traducciones"("categoriaId", "idioma");

-- CreateIndex
CREATE UNIQUE INDEX "producto_traducciones_productoId_idioma_key" ON "producto_traducciones"("productoId", "idioma");

-- CreateIndex
CREATE UNIQUE INDEX "adicional_traducciones_adicionalId_idioma_key" ON "adicional_traducciones"("adicionalId", "idioma");

-- CreateIndex
CREATE UNIQUE INDEX "ingrediente_traducciones_ingredienteId_idioma_key" ON "ingrediente_traducciones"("ingredienteId", "idioma");

-- CreateIndex
CREATE UNIQUE INDEX "mesas_numero_key" ON "mesas"("numero");

-- CreateIndex
CREATE INDEX "pedidos_mesaId_idx" ON "pedidos"("mesaId");

-- CreateIndex
CREATE INDEX "pedidos_estado_idx" ON "pedidos"("estado");

-- CreateIndex
CREATE INDEX "pedidos_creadoEn_idx" ON "pedidos"("creadoEn");

-- CreateIndex
CREATE INDEX "pedido_items_pedidoId_idx" ON "pedido_items"("pedidoId");

-- CreateIndex
CREATE INDEX "pedido_estado_historial_pedidoId_idx" ON "pedido_estado_historial"("pedidoId");

-- AddForeignKey
ALTER TABLE "categoria_traducciones" ADD CONSTRAINT "categoria_traducciones_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_traducciones" ADD CONSTRAINT "producto_traducciones_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adicional_traducciones" ADD CONSTRAINT "adicional_traducciones_adicionalId_fkey" FOREIGN KEY ("adicionalId") REFERENCES "adicionales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingrediente_traducciones" ADD CONSTRAINT "ingrediente_traducciones_ingredienteId_fkey" FOREIGN KEY ("ingredienteId") REFERENCES "ingredientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_adicionales" ADD CONSTRAINT "producto_adicionales_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_adicionales" ADD CONSTRAINT "producto_adicionales_adicionalId_fkey" FOREIGN KEY ("adicionalId") REFERENCES "adicionales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_ingredientes" ADD CONSTRAINT "producto_ingredientes_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_ingredientes" ADD CONSTRAINT "producto_ingredientes_ingredienteId_fkey" FOREIGN KEY ("ingredienteId") REFERENCES "ingredientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "mesas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item_adicionales" ADD CONSTRAINT "pedido_item_adicionales_pedidoItemId_fkey" FOREIGN KEY ("pedidoItemId") REFERENCES "pedido_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item_adicionales" ADD CONSTRAINT "pedido_item_adicionales_adicionalId_fkey" FOREIGN KEY ("adicionalId") REFERENCES "adicionales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item_ingredientes" ADD CONSTRAINT "pedido_item_ingredientes_pedidoItemId_fkey" FOREIGN KEY ("pedidoItemId") REFERENCES "pedido_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item_ingredientes" ADD CONSTRAINT "pedido_item_ingredientes_ingredienteId_fkey" FOREIGN KEY ("ingredienteId") REFERENCES "ingredientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_estado_historial" ADD CONSTRAINT "pedido_estado_historial_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
