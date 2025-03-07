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

// 🔄 Memória para armazenar contexto das conversas
const conversationMemory = new Map();

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

// 🔍 Calcula a similaridade de cosseno entre dois vetores
const cosineSimilarity = (vecA, vecB) => {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
};

// 🔍 Busca respostas passadas e calcula similaridade
const getSimilarResponses = async (userEmbedding, topN = 5) => {
  try {
    const pastResponses = await prisma.sentMessage.findMany({
      select: { content: true, embedding: true },
    });

    let similarResponses = pastResponses.map((resp) => {
      return {
        text: resp.content,
        similarity: cosineSimilarity(userEmbedding, resp.embedding),
      };
    });

    similarResponses.sort((a, b) => b.similarity - a.similarity);

    return similarResponses.slice(0, topN).map(resp => resp.text);
  } catch (error) {
    console.error("❌ Erro ao buscar respostas similares:", error);
    return [];
  }
};

// 🔍 Mantém contexto na memória para múltiplos usuários
const updateConversationMemory = (senderId, message) => {
  if (!conversationMemory.has(senderId)) {
    conversationMemory.set(senderId, []);
  }
  const conversation = conversationMemory.get(senderId);
  conversation.push(message);
  if (conversation.length > 50) conversation.shift(); // Mantém as últimas 50 mensagens
};

// 🔮 Gera uma resposta usando o ChatGPT com base no contexto relevante
const generateChatGPTResponse = async (senderId, userMessage) => {
  try {
    updateConversationMemory(senderId, { role: "user", content: userMessage });
    const userEmbedding = await generateEmbedding(userMessage);
    const similarResponses = await getSimilarResponses(userEmbedding, 5);

    let messages = [
      { role: "system", content: "Você é um assistente virtual da Vertex Store. Responda ao usuário com base nas informações anteriores da conversa, mantendo a coerência e oferecendo respostas úteis." }
    ];

    // Adiciona respostas semelhantes
    similarResponses.forEach(response => {
      messages.push({ role: "assistant", content: response });
    });

    // Adiciona o contexto da conversa do usuário
    messages = messages.concat(conversationMemory.get(senderId) || []);

    messages.push({ role: "user", content: userMessage });

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      temperature: 0.7,
    });

    const botResponse = response.choices[0].message.content;
    updateConversationMemory(senderId, { role: "assistant", content: botResponse });
    return botResponse;
  } catch (error) {
    console.error("❌ Erro ao gerar resposta com ChatGPT:", error);
    return "Desculpe, não consegui entender sua pergunta.";
  }
};

// 🚀 Processa e envia resposta baseada no contexto
const processAndSendMessage = async (senderId, content) => {
  if (!content.toLowerCase().startsWith("kisuco")) {
    console.log("❌ Mensagem ignorada (não começa com 'kisuco').");
    return;
  }
  
  console.log(`🚀 Processando mensagem de ${senderId}: ${content}`);
  const chatResponse = await generateChatGPTResponse(senderId, content);
  await sendBotMessage(senderId, chatResponse);
};

// 📤 Envia mensagem e armazena no banco
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
