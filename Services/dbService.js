const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const storeReceivedMessage = async ({ senderId, messageId, pushName, content, embedding, additionalData }) => {
  try {
    const userMessage = await prisma.userMessage.create({
      data: {
        id: messageId,
        senderId,
        pushName,
        conversation: content || "Mensagem sem texto",   
        embedding: embedding || [],
        additionalData: additionalData || {},
      },
    });

    console.log("✅ Mensagem armazenada com sucesso:");
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

    console.log("✅ Mensagem enviada armazenada com sucesso:");
    return sentMessage;
  } catch (error) {
    console.error("❌ Erro ao armazenar mensagem enviada no banco:", error);
  }
};


 

/**
* 🔍 Obtém uma mensagem recebida por ID
*/
const getUserMessageById = async (id) => {
  return await prisma.userMessage.findUnique({
      where: { id }
  });
};

/**
* 🔍 Obtém mensagens recebidas por senderId (número do WhatsApp)
*/
const getUserMessagesBySenderId = async (senderId) => {
  return await prisma.userMessage.findMany({
      where: { senderId }
  });
};

/**
* 📤 Obtém todas as mensagens enviadas (SentMessage)
*/
const getAllSentMessages = async () => {
  return await prisma.sentMessage.findMany();
};

/**
* 📤 Obtém uma mensagem enviada por ID
*/
const getSentMessageById = async (id) => {
  return await prisma.sentMessage.findUnique({
      where: { id }
  });
};

/**
* 📤 Obtém mensagens enviadas por senderId (número do WhatsApp)
*/
const getSentMessagesBySenderId = async (senderId) => {
  return await prisma.sentMessage.findMany({
      where: { senderId }
  });
};

/**
* 📌 Obtém todas as instruções embutidas (InstructionEmbedding)
*/
const getAllInstructionEmbeddings = async () => {
  return await prisma.instructionEmbedding.findMany();
};

/**
* 📌 Obtém uma instrução embutida por ID
*/
const getInstructionEmbeddingById = async (id) => {
  return await prisma.instructionEmbedding.findUnique({
      where: { id }
  });
};

async function getAllUserMessages() {
  try {
    const messages = await prisma.userMessage.findMany();
    return messages;
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);
    throw new Error("Erro ao buscar mensagens do banco de dados");
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { storeReceivedMessage,
    storeSentMessage,
    getAllUserMessages,
    getUserMessageById,
    getUserMessagesBySenderId,
    getAllSentMessages,
    getSentMessageById,
    getSentMessagesBySenderId,
    getAllInstructionEmbeddings,
    getInstructionEmbeddingById
 };
