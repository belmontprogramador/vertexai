-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Message_messageId_key" ON "Message"("messageId");
