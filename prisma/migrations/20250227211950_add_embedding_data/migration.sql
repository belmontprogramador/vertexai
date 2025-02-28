-- CreateTable
CREATE TABLE "InstructionEmbedding" (
    "id" SERIAL NOT NULL,
    "instruction" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstructionEmbedding_pkey" PRIMARY KEY ("id")
);
