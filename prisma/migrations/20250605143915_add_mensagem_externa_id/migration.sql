/*
  Warnings:

  - A unique constraint covering the columns `[mensagemExternaId]` on the table `MensagemEnviada` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "MensagemEnviada" DROP CONSTRAINT "MensagemEnviada_usuarioId_fkey";

-- AlterTable
ALTER TABLE "MensagemEnviada" ADD COLUMN     "mensagemExternaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MensagemEnviada_mensagemExternaId_key" ON "MensagemEnviada"("mensagemExternaId");

-- AddForeignKey
ALTER TABLE "MensagemEnviada" ADD CONSTRAINT "MensagemEnviada_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
