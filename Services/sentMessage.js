const axios = require("axios");
const { pipeline } = require("@xenova/transformers");
const { storeSentMessage } = require("./messageService");
const { PrismaClient } = require("@prisma/client");
const OpenAI = require("openai");
const Redis = require("ioredis");

const prisma = new PrismaClient();
const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
  db: 0,
});

const INSTANCE_ID = process.env.INSTANCE_ID;
const API_URL = `https://api.w-api.app/v1/message/send-text?instanceId=${INSTANCE_ID}`;
const TOKEN = process.env.TOKEN;
const BOT_PHONE_NUMBER = process.env.BOT_PHONE_NUMBER || "5522981413041";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

let embedder = null;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// 🔄 Carrega o modelo de embeddings
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

// 🔍 Calcula similaridade de cosseno
const cosineSimilarity = (vecA, vecB) => {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
};

// 🔍 Busca respostas similares do banco
const getSimilarResponses = async (userEmbedding, topN = 3) => {
  try {
    const pastResponses = await prisma.sentMessage.findMany({
      select: { content: true, embedding: true },
    });

    let similarResponses = pastResponses.map((resp) => ({
      text: resp.content,
      similarity: cosineSimilarity(userEmbedding, resp.embedding),
    }));

    similarResponses.sort((a, b) => b.similarity - a.similarity);

    return similarResponses.slice(0, topN).map((resp) => resp.text);
  } catch (error) {
    console.error("❌ Erro ao buscar respostas similares:", error);
    return [];
  }
};

// 🔄 Armazena mensagens do usuário no Redis
const storeUserMessage = async (userId, message) => {
  const key = `chat_history:${userId}`;
  await redis.rpush(key, message);
  await redis.ltrim(key, -20, -1);
};

// 🔄 Armazena o contexto do usuário no Redis
const setUserStage = async (userId, stage) => {
  await redis.set(`user_stage:${userId}`, stage);
};
const getUserStage = async (userId) => {
  return await redis.get(`user_stage:${userId}`) || "abordagem";
};


// 🔍 Recupera histórico do usuário
const getUserChatHistory = async (userId) => {
  const key = `chat_history:${userId}`;
  return await redis.lrange(key, 0, -1);
};

// 🔄 Armazena o timestamp da última mensagem do usuário
const setLastInteraction = async (userId) => {
  const timestamp = Date.now(); // Marca o momento atual
  await redis.set(`last_interaction:${userId}`, timestamp);
};

// ⏳ Obtém o tempo desde a última interação
const getLastInteraction = async (userId) => {
  const timestamp = await redis.get(`last_interaction:${userId}`);
  return timestamp ? parseInt(timestamp, 10) : null;
};


// 🔮 Gera resposta do ChatGPT com histórico e respostas similares
const generateChatGPTResponse = async (senderId, userMessage) => {
  try {
    await storeUserMessage(senderId, `Usuário: ${userMessage}`);
    const chatHistory = await getUserChatHistory(senderId);
    const userEmbedding = await generateEmbedding(userMessage);
    const similarResponses = await getSimilarResponses(userEmbedding, 3);

    const userStage = await getUserStage(senderId);

    let stageInstructions = {
      abordagem: "Você deve se apresentar de forma amigável e envolvente. Faça perguntas abertas para engajar o cliente, como: 'Olá! Como posso te ajudar hoje? 😊' Descubra o nome do usuário e chame sempre pelo nome para criar conexão.",
      identificação_necessidade: "Descubra o que o cliente realmente precisa. Pergunte sobre sua rotina, dores e expectativas. Exemplo: 'Qual o maior desafio que você enfrenta ao usar seu celular hoje?'. Não fale apenas sobre aspectos técnicos do produto, mas também sobre os benefícios práticos no dia a dia. Exemplo: 'Essa câmera vai deixar suas fotos no Instagram incríveis! 📸🔥' ou 'Esse celular é ótimo para jogos, ele roda liso e sem travamentos! 🎮🚀'.",
      sondagem_orcamento: "Oriente o cliente sobre as opções dentro do orçamento dele. Exemplo: 'Temos modelos com ótimo custo-benefício. Qual faixa de preço você está considerando? 💰'. Se necessário, reforce vantagens específicas para justificar o preço.",
      formas_pagamento: "Apresente as condições de pagamento de forma clara e persuasiva. Exemplo: 'Aceitamos cartão, Pix e parcelamos em até 10x. O que fica melhor para você? 💳✨'. Também oferecemos parcelamento no boleto, basta informar CPF, Nome e Data de Nascimento. Após isso, diga que ele tem **90% de aprovação** e siga para o fechamento.",
      fechamento: "Crie urgência e incentive a tomada de decisão. Existem **duas formas de fechamento**: (1) **Agendar uma visita** na loja (Avenida Getúlio Vargas, 333 - Loja 6B, Araruama) para concluir a compra ou (2) **Entrega em domicílio** para as cidades de Bacaxá, Saquarema, Araruama, Iguaba, São Pedro e Cabo Frio, por uma pequena taxa de entrega. 🔥 'Essa oferta só está disponível hoje! Posso garantir seu pedido agora?' 😉",
    };

    let messages = [
      {
        role: "system",
        content: `Você é a Anna, uma vendedora virtual da Vertex Store. Sua missão é criar uma experiência encantadora para os clientes, garantindo que eles se sintam valorizados e bem-atendidos. 

      💡 **Personalidade da Anna:**
      - Amigável e entusiasmada, sempre chamando o cliente pelo nome.
      - Comunicativa e descontraída, com um tom humanizado e envolvente.
      - Paciente e empática, entendendo as necessidades do cliente antes de oferecer soluções.

      📣 **Tom de Voz:**
      - Alegre e motivador, mas sem exageros.
      - Linguagem informal e natural, como se estivesse conversando pessoalmente.
      - Usa emojis e expressões para deixar a conversa leve e dinâmica (exemplo: '😍', '🔥', '😉').

      🎯 **Diretrizes de Atendimento:**
      - Se o cliente parecer indeciso, use frases como: "Essa promoção está incrível! Não perca essa chance! 😍"
      - Se o cliente fizer perguntas técnicas, sempre relacione a resposta com benefícios práticos: 
        - **Exemplo:** "Esse celular tem 128GB de memória, então você pode baixar vários apps e tirar quantas fotos quiser sem se preocupar com espaço! 📱✨"
      - Se o cliente hesitar na compra, reforce depoimentos positivos de outros clientes e crie urgência:
        - **Exemplo:** "Essa oferta só está disponível até hoje! Não perca a oportunidade de garantir o seu. 😉🔥"
          
      💳 **No momento, o cliente está na fase:** ${userStage}.
      ${stageInstructions[userStage]}
      
      🔄 **Adapte sua resposta para seguir o estilo das conversas passadas. Aqui estão alguns exemplos de respostas anteriores para manter a coerência no tom de voz e abordagem:**\n"${similarResponses.join('"\n"')}"
      
      Agora, responda ao cliente mantendo esse tom e estilo.`,
      },
    ];

    if (similarResponses.length > 0) {
      messages.push({
        role: "system",
        content: `Essas são respostas anteriores semelhantes que devem ser usadas como referência no estilo da resposta: \n"${similarResponses.join("\n")}"`,
      });
    }

    chatHistory.forEach((msg) => messages.push({ role: "user", content: msg }));
    messages.push({ role: "user", content: userMessage });

    console.log("🔄 Chamando OpenAI API...");
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      temperature: 0.7,
      max_tokens: 150,
    });

    let botResponse = response.choices[0].message.content.trim();
    botResponse = botResponse.replace(/\bbot\b/gi, "").trim();

    await storeUserMessage(senderId, botResponse);

    // 🚀 Atualiza a fase do cliente automaticamente
    if (userStage === "abordagem") {
      await setUserStage(senderId, "identificação_necessidade");
    } else if (userStage === "identificação_necessidade") {
      await setUserStage(senderId, "sondagem_orcamento");
    } else if (userStage === "sondagem_orcamento") {
      await setUserStage(senderId, "formas_pagamento");
    } else if (userStage === "formas_pagamento") {
      await setUserStage(senderId, "fechamento");
    }

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

  try {
    console.log("🔄 Chamando generateChatGPTResponse...");
    const chatResponse = await generateChatGPTResponse(senderId, content);

    if (!chatResponse || chatResponse.trim() === "") {
      console.error("❌ Erro: Resposta gerada pelo ChatGPT está vazia ou indefinida!");
      return;
    }

    console.log(`📩 Resposta gerada: ${chatResponse}`);

    console.log(`📤 Enviando mensagem para ${senderId}...`);
    await sendBotMessage(senderId, chatResponse);
    console.log(`✅ Mensagem enviada para ${senderId}`);
  } catch (error) {
    console.error("❌ Erro no processamento da mensagem:", error);
  }
};

// 📤 Envia mensagem do bot
const sendBotMessage = async (recipientId, content) => {
  try {
    console.log(`📤 Enviando mensagem para ${recipientId}: ${content}`);

    const response = await axios.post(
      API_URL,
      {
        phone: recipientId,
        message: content,
        delayMessage: 3,
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Resposta da API ao enviar mensagem:`, response.data);

    return response.data;
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem:", error.response?.data || error.message);
  }
};

module.exports = { processAndSendMessage, sendBotMessage };
