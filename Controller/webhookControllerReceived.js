const { storeReceivedMessage } = require("../Services/messageService");
const { processAndSendMessage} = require("../Services/sentMessage"); // ✅ Importa serviço atualizado
const { pipeline } = require("@xenova/transformers");

let embedder = null;

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

// 📩 Controller para mensagens recebidas
const webhookControllerReceived = async (req, res) => {
  try {
    console.log("🔍 Dados completos recebidos no webhook:");
    console.dir(req.body, { depth: null });

    // Captura todas as informações recebidas
    const {
      messageId,
      sender,
      msgContent,
      ...additionalData
    } = req.body;

    if (!messageId || !sender?.id) {
      console.log("🚨 Nenhuma mensagem válida recebida.");
      return res.status(400).json({ error: "Nenhuma mensagem válida recebida." });
    }

    const senderId = sender.id;
    const senderName = sender.pushName || sender.name || "Desconhecido";

    // 🚨 Verifica se a mensagem foi enviada pelo próprio bot
    if (senderId === process.env.BOT_PHONE_NUMBER) {
      console.log("🚨 Mensagem do próprio bot detectada. Ignorando...");
      return res.status(200).json({ message: "Mensagem ignorada (enviada pelo próprio bot)." });
    }

    // 📌 Captura mensagens de texto normais e formatadas
    const content = msgContent?.conversation?.trim() ||
                    msgContent?.extendedTextMessage?.text?.trim() ||
                    undefined;

    // 📌 Se não houver mensagem de texto válida, ignora
    if (!content || content.length === 0) {
      console.log("🚨 Mensagem ignorada (não contém texto válido).");
      return res.status(200).json({ message: "Mensagem ignorada (não contém texto válido)." });
    }

    console.log(`📩 Mensagem recebida:
      - ID: ${messageId}
      - Remetente: ${senderName} (${senderId})
      - Conteúdo: ${content}`);

    // Gera embedding apenas se houver texto na mensagem
    const embedding = await generateEmbedding(content);

    // 🔄 Salva a mensagem no banco, incluindo os dados extras
    await storeReceivedMessage({ messageId, senderId, pushName: senderName, content, embedding, additionalData });

    // 🔄 Envia para o serviço de resposta automática
    await processAndSendMessage(senderId, content);

    res.json({ message: "Mensagem processada e armazenada com sucesso!", data: req.body });
  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error);
    res.status(500).json({ error: "Erro ao processar a mensagem recebida." });
  }
};

module.exports = { webhookControllerReceived };
