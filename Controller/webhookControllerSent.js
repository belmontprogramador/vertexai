const { pipeline } = require("@xenova/transformers");

let embedder = null;

// 🔄 Carrega o modelo de embeddings uma única vez
const loadModel = async () => {
  if (!embedder) {
    console.log("🔄 Carregando modelo de embeddings...");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("✅ Modelo carregado com sucesso!");
  }
};

// 📌 Função para gerar embedding
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

// 📩 Controller para mensagens enviadas
const webhookControllerSent = async (req, res) => {
  try {
    console.log("📡 Webhook acionado para mensagens enviadas!");

    const { instanceId, fromMe, messageId, chat, sender, msgContent } = req.body;
    
    if (!fromMe || !msgContent || !messageId || !chat || !chat.id) {
      console.log("🚨 Nenhuma mensagem enviada válida recebida.");
      return res.status(400).json({ error: "Nenhuma mensagem enviada recebida" });
    }
    
    let content = "";
    let mediaType = "";
    let mediaUrl = "";
    
    if (msgContent.extendedTextMessage) {
      content = msgContent.extendedTextMessage.text;
    } else if (msgContent.conversation) {
      content = msgContent.conversation;
    } else if (msgContent.imageMessage) {
      mediaType = "Imagem";
      mediaUrl = msgContent.imageMessage.url;
    } else if (msgContent.videoMessage) {
      mediaType = "Vídeo";
      mediaUrl = msgContent.videoMessage.url;
    } else if (msgContent.audioMessage) {
      mediaType = "Áudio";
      mediaUrl = msgContent.audioMessage.url;
    } else if (msgContent.stickerMessage) {
      mediaType = "Sticker";
      mediaUrl = msgContent.stickerMessage.url;
    } else if (msgContent.documentMessage) {
      mediaType = "Documento";
      mediaUrl = msgContent.documentMessage.url;
    }

    console.log(`📤 Mensagem enviada:
      - ID: ${messageId}
      - Destinatário: ${chat.id}
      - ${content ? `Conteúdo: ${content}` : `Mídia: ${mediaType} (${mediaUrl})`}`);
    
    // 🔄 Gerar embedding apenas para mensagens de texto
    if (content) {
      const embedding = await generateEmbedding(content);
      if (embedding) {
        console.log("✅ Embedding gerado com sucesso!");
        console.log("   🔹 Primeiros valores:", embedding.slice(0, 5));
      } else {
        console.log("❌ Falha ao gerar embedding.");
      }
    }

    res.json({ message: "Mensagem enviada processada com sucesso!" });
  } catch (error) {
    console.error("❌ Erro ao processar webhook de mensagens enviadas:", error);
    res.status(500).json({ error: "Erro ao processar a mensagem enviada" });
  }
};

module.exports = { webhookControllerSent };