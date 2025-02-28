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

// 📌 Função para gerar embedding da mensagem
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

// 📩 Controller do Webhook para Mensagens Recebidas (Texto e Mídia)
const webhookControllerReceived = async (req, res) => {
  try {
    const { messageId, sender, msgContent, mediaUrl } = req.body;

    // 📌 Identifica o tipo de mensagem recebida
    let content = msgContent?.conversation || msgContent?.extendedTextMessage?.text || null;
    let mediaType = null;
    let mediaLink = null;

    if (msgContent?.imageMessage) {
      mediaType = "Imagem";
      mediaLink = mediaUrl || msgContent.imageMessage.url;
    } else if (msgContent?.videoMessage) {
      mediaType = "Vídeo";
      mediaLink = mediaUrl || msgContent.videoMessage.url;
    } else if (msgContent?.audioMessage) {
      mediaType = "Áudio";
      mediaLink = mediaUrl || msgContent.audioMessage.url;
    } else if (msgContent?.documentMessage) {
      mediaType = "Documento";
      mediaLink = mediaUrl || msgContent.documentMessage.url;
    }

    if (!messageId || !sender?.id) {
      console.log("🚨 Nenhuma mensagem válida recebida.");
      return res.status(400).json({ error: "Nenhuma mensagem válida recebida." });
    }

    const senderId = sender.id;

    // 📌 Log formatado para mensagens de texto e mídia
    console.log(`📩 Mensagem recebida:
      - ID: ${messageId}
      - Remetente: ${senderId}`);

    if (content) {
      console.log(`      - Conteúdo: ${content}`);
    }

    if (mediaType) {
      console.log(`      - Tipo de Mídia: ${mediaType}`);
      console.log(`      - URL da Mídia: ${mediaLink}`);
    }

    // 🔄 Gerar embedding somente para mensagens de texto
    if (content) {
      const embedding = await generateEmbedding(content);

      if (embedding) {
        console.log("✅ Embedding gerado com sucesso!");
        console.log("   🔹 Primeiros valores:", embedding.slice(0, 5)); // Exibe os 5 primeiros valores do embedding
      } else {
        console.log("❌ Falha ao gerar embedding.");
      }
    }

    res.json({ message: "Mensagem processada com sucesso!" });
  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error);
    res.status(500).json({ error: "Erro ao processar a mensagem recebida." });
  }
};

module.exports = { webhookControllerReceived };
