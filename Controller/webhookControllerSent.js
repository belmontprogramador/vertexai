const { storeSentMessage } = require("../Services/messageService");
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

// 📤 Controller para mensagens enviadas
const webhookControllerSent = async (req, res) => {
  try {
    console.log("📡 Webhook acionado para mensagens enviadas!");
    console.log("🔍 Dados completos recebidos no webhook:");
    console.dir(req.body, { depth: null });

    const { messageId, chat, msgContent, fromMe, sender } = req.body;

    if (!fromMe || !msgContent || !messageId || !chat || !chat.id || !sender?.id) {
      console.log("🚨 Nenhuma mensagem enviada válida recebida.");
      return res.status(400).json({ error: "Nenhuma mensagem enviada recebida" });
    }

    const senderId = sender.id; 
    const verifiedBizName = sender.verifiedBizName || null;
    const recipientId = chat.id;
    const content = msgContent.conversation || msgContent.extendedTextMessage?.text || "Mensagem sem texto";
    const isAI = fromMe;

    console.log(`📤 Mensagem enviada:
      - ID: ${messageId}
      - Remetente: ${senderId} (Negócio: ${verifiedBizName || "Não verificado"})
      - Destinatário: ${recipientId}
      - Conteúdo: ${content}`);

    let embedding = [];
    if (content) {
      embedding = await generateEmbedding(content);
    }

    // 🔄 Salva a resposta no banco
    await storeSentMessage({ messageId, senderId, verifiedBizName, recipientId, content, embedding, isAI });

    res.json({ message: "Mensagem enviada processada com sucesso!" });
  } catch (error) {
    console.error("❌ Erro ao processar webhook de mensagens enviadas:", error);
    res.status(500).json({ error: "Erro ao processar a mensagem enviada" });
  }
};

module.exports = { webhookControllerSent };
