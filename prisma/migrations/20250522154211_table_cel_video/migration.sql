-- CreateTable
CREATE TABLE "CelularVideos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "subTitulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "fraseImpacto" TEXT NOT NULL,
    "precoParcelado" TEXT NOT NULL,
    "preco" INTEGER NOT NULL,
    "videoURL" TEXT,

    CONSTRAINT "CelularVideos_pkey" PRIMARY KEY ("id")
);
