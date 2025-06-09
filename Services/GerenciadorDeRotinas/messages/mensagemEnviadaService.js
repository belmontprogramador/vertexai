const { prisma } = require("../../lib/prisma");

const registrarOuAtualizarMensagem = async ({ telefone, conteudo, tipo, mensagemExternaId }) => {
    const usuario = await prisma.usuario.upsert({
      where: { telefone },
      update: {},
      create: { telefone },
    });
  
    const mensagemExistente = await prisma.mensagemEnviada.findFirst({
      where: {
        usuarioId: usuario.id,
        tipo,
        criadoEm: {
          gte: new Date(Date.now() - 10 * 60 * 1000),
        },
      },
      orderBy: { criadoEm: "desc" },
    });
  
    if (mensagemExistente) {
      return await prisma.mensagemEnviada.update({
        where: { id: mensagemExistente.id },
        data: { conteudo },
      });
    }
  
    return await prisma.mensagemEnviada.create({
      data: {
        conteudo,
        tipo,
        mensagemExternaId, // 🔁 novo campo aqui
        usuarioId: usuario.id,
      },
    });
  };
  

module.exports = { registrarOuAtualizarMensagem };
