const { storeReceivedMessage } = require("../Services/messageService");
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
    return null;
  }
};

// 📩 Controller para mensagens recebidas
const webhookControllerReceived = async (req, res) => {
  try {
    const { messageId, sender, msgContent } = req.body;

    if (!messageId || !sender?.id) {
      console.log("🚨 Nenhuma mensagem válida recebida.");
      return res.status(400).json({ error: "Nenhuma mensagem válida recebida." });
    }

    const senderId = sender.id;
    const senderName = sender.pushName || sender.name || "Desconhecido";
    const content = msgContent?.conversation || msgContent?.extendedTextMessage?.text || null;

    console.log(`📩 Mensagem recebida:
      - ID: ${messageId}
      - Remetente: ${senderName} (${senderId})
      - Conteúdo: ${content}`);

    let embedding = null;
    if (content) {
      embedding = await generateEmbedding(content);
    }

    // 🔄 Salva a mensagem no banco
    await storeReceivedMessage({ messageId, senderId, senderName, content, embedding });

    res.json({ message: "Mensagem processada com sucesso!" });
  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error);
    res.status(500).json({ error: "Erro ao processar a mensagem recebida." });
  }
};

module.exports = { webhookControllerReceived };
