const { PrismaClient } = require("@prisma/client");
const { getEmbedding, saveEmbedding } = require("./embeddingService");

const prisma = new PrismaClient();

// Função para verificar se uma mensagem já existe no banco
const messageExists = async (messageId) => {
  try {
    const existingMessage = await prisma.message.findUnique({ where: { messageId } });
    return existingMessage !== null;
  } catch (error) {
    console.error("Erro ao verificar existência da mensagem:", error);
    return false;
  }
};

// Função para salvar uma nova mensagem
const saveMessage = async (messageId, sender, content) => {
  try {
    // Verifica se a mensagem já existe para evitar duplicação
    const exists = await messageExists(messageId);
    if (exists) {
      console.log(`Mensagem ${messageId} já armazenada, evitando duplicação.`);
      return;
    }

    // Criar o registro da mensagem sem o embedding (será adicionado depois)
    await prisma.message.create({
      data: {
        messageId,
        sender,
        content,
        embedding: [], // Placeholder
      },
    });

    // Gerar embedding e atualizar no banco
    const embedding = await getEmbedding(content);
    if (embedding) {
      await saveEmbedding(messageId, embedding);
    }

    console.log("Mensagem e embedding armazenados com sucesso!");
  } catch (error) {
    console.error("Erro ao salvar mensagem:", error);
  }
};

module.exports = { saveMessage };
