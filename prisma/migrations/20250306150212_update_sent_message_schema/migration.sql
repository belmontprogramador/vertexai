-- CreateTable
CREATE TABLE "SentMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "verifiedBizName" TEXT,
    "recipientId" TEXT NOT NULL,
    "content" TEXT,
    "embedding" DOUBLE PRECISION[],
    "isAI" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SentMessage_id_key" ON "SentMessage"("id");
