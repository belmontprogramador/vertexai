const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const storeReceivedMessage = async ({ senderId, messageId, pushName, content, embedding, additionalData }) => {
  try {
    const userMessage = await prisma.userMessage.create({
      data: {
        id: messageId,
        senderId,
        pushName,
        conversation: content || "Mensagem sem texto", // Aqui estava o erro
        embedding: embedding || [],
        additionalData: additionalData || {},
      },
    });

    console.log("✅ Mensagem armazenada com sucesso:", userMessage);
    return userMessage;
  } catch (error) {
    console.error("❌ Erro ao armazenar mensagem no banco:", error);
  }
};



// 🔹 Função para armazenar mensagem enviada (humano ou IA)
const storeSentMessage = async ({ messageId, senderId, verifiedBizName, recipientId, content, embedding, isAI }) => {
  try {
    const sentMessage = await prisma.sentMessage.create({
      data: {
        id: messageId,
        senderId,
        verifiedBizName,
        recipientId,
        content: content || "Mensagem sem texto",
        embedding: embedding || [],
        isAI,
      },
    });

    console.log("✅ Mensagem enviada armazenada com sucesso:", sentMessage);
    return sentMessage;
  } catch (error) {
    console.error("❌ Erro ao armazenar mensagem enviada no banco:", error);
  }
};



module.exports = { storeReceivedMessage, storeSentMessage };
