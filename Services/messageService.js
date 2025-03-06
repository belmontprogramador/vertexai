const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// 🔹 Função para armazenar mensagem recebida
const storeReceivedMessage = async ({ messageId, senderId, senderName, content, embedding }) => {
  try {
    // 📌 Verifica se o usuário já existe, senão cria um novo
    let user = await prisma.user.findUnique({
      where: { id: senderId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: senderId,
          name: senderName,
        },
      });
    }

    // 📌 Insere a mensagem no banco
    const message = await prisma.message.create({
      data: {
        id: messageId,
        sender: senderId,
        content,
        embedding,
        userId: user.id, // Relaciona com o usuário
      },
    });

    console.log("✅ Mensagem recebida armazenada com sucesso!", message);
  } catch (error) {
    console.error("❌ Erro ao armazenar mensagem recebida:", error);
  }
};

// 🔹 Função para armazenar mensagem enviada (humano ou IA)
const storeSentMessage = async ({ messageId, recipientId, content, embedding, isAI }) => {
  try {
    // 📌 Armazena a resposta no banco
    const response = await prisma.response.create({
      data: {
        messageId,
        content,
        embedding,
        isAI,
      },
    });

    console.log("✅ Resposta armazenada com sucesso!", response);
  } catch (error) {
    console.error("❌ Erro ao armazenar mensagem enviada:", error);
  }
};

module.exports = { storeReceivedMessage, storeSentMessage };
