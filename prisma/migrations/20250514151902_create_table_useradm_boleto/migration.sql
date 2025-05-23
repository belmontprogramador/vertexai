-- CreateTable
CREATE TABLE "CelularBoleto" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "subTitulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "fraseImpacto" TEXT NOT NULL,
    "precoParcelado" TEXT NOT NULL,
    "preco" INTEGER NOT NULL,
    "imageURL" TEXT NOT NULL,

    CONSTRAINT "CelularBoleto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSistem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSistem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSistem_email_key" ON "UserSistem"("email");
