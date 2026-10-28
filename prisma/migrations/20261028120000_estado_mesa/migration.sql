-- CreateEnum
CREATE TYPE "EstadoMesa" AS ENUM ('LIBRE', 'OCUPADA', 'RESERVADA');

-- AlterTable
ALTER TABLE "mesas" ADD COLUMN     "estado" "EstadoMesa" NOT NULL DEFAULT 'LIBRE';
