/*
  Warnings:

  - You are about to drop the `Message` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Response` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_InstructionEmbeddingToMessage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_userId_fkey";

-- DropForeignKey
ALTER TABLE "Response" DROP CONSTRAINT "Response_messageId_fkey";

-- DropForeignKey
ALTER TABLE "_InstructionEmbeddingToMessage" DROP CONSTRAINT "_InstructionEmbeddingToMessage_A_fkey";

-- DropForeignKey
ALTER TABLE "_InstructionEmbeddingToMessage" DROP CONSTRAINT "_InstructionEmbeddingToMessage_B_fkey";

-- DropTable
DROP TABLE "Message";

-- DropTable
DROP TABLE "Response";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "_InstructionEmbeddingToMessage";

-- CreateTable
CREATE TABLE "UserMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "pushName" TEXT NOT NULL,
    "conversation" TEXT,
    "embedding" DOUBLE PRECISION[],
    "additionalData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserMessage_id_key" ON "UserMessage"("id");
