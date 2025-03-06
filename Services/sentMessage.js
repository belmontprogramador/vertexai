const axios = require("axios");
const { pipeline } = require("@xenova/transformers");
const { storeSentMessage } = require("./messageService");
const { PrismaClient } = require("@prisma/client");
const OpenAI = require("openai");

const prisma = new PrismaClient();

const INSTANCE_ID = process.env.INSTANCE_ID;
const API_URL = `https://api.w-api.app/v1/message/send-text?instanceId=${INSTANCE_ID}`;
const TOKEN = process.env.TOKEN;
const BOT_PHONE_NUMBER = process.env.BOT_PHONE_NUMBER || "5522981413041";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

let embedder = null;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// 🔄 Carrega o modelo de embeddings (se ainda não foi carregado)
const loadModel = async () => {
  if (!embedder) {
    console.log("🔄 Carregando modelo de embeddings...");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("✅ Modelo carregado com sucesso!");
  }
};

// 📌 Gera embeddings da mensagem
const generateEmbedding = async (text) => {
  try {
    await loadModel();
    const embedding = await embedder(text, { pooling: "mean", normalize: true });
    return Array.from(embedding.data);
  } catch (error) {
    console.error("❌ Erro ao gerar embedding:", error);
    return [];
  }
};

// 🔍 Busca as últimas 50 mensagens enviadas PELO USUÁRIO
const getUserMessageHistory = async (senderId) => {
  try {
    const messages = await prisma.userMessage.findMany({
      where: { senderId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { conversation: true },
    });

    const history = messages.map((msg) => msg.conversation).filter(Boolean);
    
    // 🚀 LOG: Últimas mensagens do usuário
    console.log(`📜 Últimas 50 mensagens enviadas pelo usuário (${senderId}):`, history);

    return history;
  } catch (error) {
    console.error("❌ Erro ao buscar histórico do usuário:", error);
    return [];
  }
};

// 🔍 Busca as últimas 50 mensagens enviadas PARA o usuário (humanos + bot)
const getConversationHistoryWithUser = async (senderId) => {
  try {
    const messages = await prisma.sentMessage.findMany({
      where: { recipientId: senderId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { content: true, isAI: true },
    });

    const conversation = messages.map((msg) => `(${msg.isAI ? "Bot" : "Humano"}) ${msg.content}`).filter(Boolean);
    
    // 🚀 LOG: Últimas mensagens enviadas para o usuário
    console.log(`💬 Últimas 50 mensagens enviadas PARA o usuário (${senderId}):`, conversation);

    return conversation;
  } catch (error) {
    console.error("❌ Erro ao buscar histórico de mensagens para o usuário:", error);
    return [];
  }
};

// 🔮 Gera uma resposta usando o ChatGPT com base no contexto, histórico do usuário e mensagens recebidas
const generateChatGPTResponse = async (senderId, context, userMessage) => {
  try {
    const userHistory = await getUserMessageHistory(senderId);
    const conversationHistory = await getConversationHistoryWithUser(senderId);

    let contextText = context.map((msg, i) => `Mensagem ${i + 1}: "${msg.content}"`).join("\n");
    let historyText = userHistory.map((msg, i) => `Usuário ${i + 1}: "${msg}"`).join("\n");
    let conversationText = conversationHistory.map((msg, i) => `Mensagem ${i + 1}: "${msg}"`).join("\n");

    const prompt = `
Você é um assistente virtual da Vertex Store. Responda ao usuário com base nas informações que já foram trocadas anteriormente.

### CONTEXTO DE MENSAGENS SEMELHANTES:
${contextText || "Nenhuma mensagem relevante encontrada no histórico."}

### HISTÓRICO DAS ÚLTIMAS MENSAGENS DO USUÁRIO:
${historyText || "Nenhum histórico de conversa disponível."}

### HISTÓRICO DAS ÚLTIMAS RESPOSTAS PARA O USUÁRIO:
${conversationText || "Nenhum histórico de conversa disponível."}

### MENSAGEM DO USUÁRIO:
"${userMessage}"

### SUA RESPOSTA:
Forneça uma resposta clara e objetiva, utilizando o contexto e o histórico do usuário sempre que possível para manter a coerência da conversa.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("❌ Erro ao gerar resposta com ChatGPT:", error);
    return "Desculpe, não consegui entender sua pergunta.";
  }
};

// 🚀 Processa e envia resposta baseada no histórico, contexto e ChatGPT
const processAndSendMessage = async (senderId, content) => {
  if (content.toLowerCase().startsWith("kisuco")) {
    console.log(`🚀 Mensagem detectada com palavra-chave "kisuco". Processando resposta contextual...`);

    const userEmbedding = await generateEmbedding(content);
    const chatResponse = await generateChatGPTResponse(senderId, [], content);

    await sendBotMessage(senderId, chatResponse);
  }
};

// 📤 Envia mensagem e armazena no banco com isAI: true
const sendBotMessage = async (recipientId, content) => {
  try {
    const response = await axios.post(API_URL, {
      phone: recipientId,
      message: content,
      delayMessage: 5,
    }, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const messageId = response.data.messageId || `BOT_MSG_${Date.now()}`;

    console.log(`✅ Mensagem enviada pelo bot para ${recipientId}: ${content} (ID: ${messageId})`);

    const embedding = await generateEmbedding(content);

    await storeSentMessage({
      messageId,
      senderId: BOT_PHONE_NUMBER,
      verifiedBizName: "Vertex Store",
      recipientId,
      content,
      embedding,
      isAI: true,
    });

    return response.data;
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem do bot:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = { processAndSendMessage, sendBotMessage };
