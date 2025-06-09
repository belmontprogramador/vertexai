-- DropForeignKey
ALTER TABLE "MensagemEnviada" DROP CONSTRAINT "MensagemEnviada_usuarioId_fkey";

-- AddForeignKey
ALTER TABLE "MensagemEnviada" ADD CONSTRAINT "MensagemEnviada_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
