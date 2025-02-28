require("dotenv").config();
const { storeEmbeddingIfNotExists, getEmbedding } = require("../services/embeddingService");

const storeEmbedding = async (req, res) => {
  try {
    const { input, sessionId } = req.body;

    if (!input) {
      return res.status(400).json({ error: "O texto de entrada é obrigatório" });
    }

    if (!sessionId) {
      return res.status(400).json({ error: "O sessionId é obrigatório para manter o contexto da conversa." });
    }

    // Gerar embedding localmente
    const inputEmbedding = await getEmbedding(input);
    if (!inputEmbedding) {
      return res.status(500).json({ error: "Erro ao gerar embedding localmente." });
    }

    // Salvar embedding no banco de dados
    const storedEmbedding = await storeEmbeddingIfNotExists(sessionId, input, inputEmbedding);

    if (storedEmbedding) {
      return res.json({
        message: storedEmbedding.existing ? "Embedding já existia no banco, evitando duplicação." : "Embedding armazenado com sucesso!",
      });
    } else {
      return res.status(500).json({ error: "Erro ao armazenar embedding no banco." });
    }
  } catch (error) {
    console.error("Erro ao processar o armazenamento do embedding:", error);
    res.status(500).json({ error: "Erro ao processar o armazenamento do embedding" });
  }
};

module.exports = { storeEmbedding };
