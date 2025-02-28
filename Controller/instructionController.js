const { storeEmbeddingIfNotExists, findMostSimilarInstruction, getEmbedding } = require("../services/embeddingService");
const axios = require("axios");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHATGPT_URL = "https://api.openai.com/v1/chat/completions";

// Função para enviar ao ChatGPT e obter resposta
const sendToChatGPT = async (userQuestion, instruction) => {
  try {
    const response = await axios.post(
      CHATGPT_URL,
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: "Você é um assistente especializado em vendas de celulares e acessórios." },
          { role: "user", content: `Pergunta do cliente: ${userQuestion}` },
          { role: "assistant", content: `Baseado na seguinte instrução: ${instruction}` }
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Erro ao obter resposta do ChatGPT:", error.response?.data || error.message);
    return "Desculpe, não consegui gerar uma resposta no momento.";
  }
};

// Controller principal
const processUserInput = async (req, res) => {
  try {
    const { text, sessionId } = req.body;

    if (!text || !sessionId) {
      return res.status(400).json({ error: "Texto e sessionId são obrigatórios." });
    }

    // Gera embedding localmente e armazena no banco se necessário
    const userEmbedding = await getEmbedding(text);
    if (!userEmbedding) {
      return res.status(500).json({ error: "Erro ao gerar embedding localmente." });
    }

    await storeEmbeddingIfNotExists(sessionId, text, userEmbedding);

    // Busca a instrução mais similar
    const matchResult = await findMostSimilarInstruction(text);

    console.log("Resultado da busca de similaridade:", matchResult);

    if (!matchResult) {
      return res.json({ message: "Nenhuma instrução similar encontrada." });
    }

    let { instruction, similarity } = matchResult;

    // Converte similarity para número caso seja uma string
    similarity = parseFloat(similarity);

    // Verifica se similarity é um número válido
    if (isNaN(similarity)) {
      console.error("Erro: similaridade retornada não é um número válido.", similarity);
      return res.status(500).json({ error: "Erro interno ao calcular a similaridade." });
    }

    const similarityPercentage = (similarity * 100).toFixed(2) + "%"; // Converte para porcentagem

    console.log(`Instrução encontrada: ${instruction}`);
    console.log(`Grau de similaridade: ${similarityPercentage}`);

    // Envia para o ChatGPT
    const chatGPTResponse = await sendToChatGPT(text, instruction);

    res.json({
      message: "Instrução mais similar encontrada!",
      instruction,
      similarity: similarity.toFixed(2), // Mantém o valor decimal normal
      similarityScore: similarityPercentage, // Exibe em formato de porcentagem
      chatGPTResponse,
    });
  } catch (error) {
    console.error("Erro ao processar entrada do usuário:", error);
    res.status(500).json({ error: "Erro ao processar entrada do usuário" });
  }
};

module.exports = { processUserInput };
