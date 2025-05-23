-- CreateTable
CREATE TABLE "CelularVideosBoleto" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "subTitulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "fraseImpacto" TEXT NOT NULL,
    "precoParcelado" TEXT NOT NULL,
    "preco" INTEGER NOT NULL,
    "videoURL" TEXT,

    CONSTRAINT "CelularVideosBoleto_pkey" PRIMARY KEY ("id")
);
