-- CreateTable
CREATE TABLE "Celular" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "subTitulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "fraseImpacto" TEXT NOT NULL,
    "precoParcelado" TEXT NOT NULL,
    "preco" INTEGER NOT NULL,

    CONSTRAINT "Celular_pkey" PRIMARY KEY ("id")
);
