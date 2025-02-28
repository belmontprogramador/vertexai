require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
 
const prisma = new PrismaClient();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

// Função para obter embeddings do OpenAI
const getEmbedding = async (text) => {
  try {
    const response = await axios.post(
      EMBEDDINGS_URL,
      { model: "text-embedding-ada-002", input: text },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" } }
    );
    return response.data.data[0].embedding;
  } catch (error) {
    console.error("Erro ao gerar embedding:", error.response?.data || error.message);
    return null;
  }
};

// Função para calcular similaridade cosseno entre dois vetores
const calculateCosineSimilarity = (vecA, vecB) => {
  const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

// Função para verificar se um embedding já existe no banco
const findExistingEmbedding = async (text) => {
  try {
    const newEmbedding = await getEmbedding(text);
    if (!newEmbedding) return null;

    const existingEmbeddings = await prisma.userEmbedding.findMany({
      select: { id: true, question: true, embedding: true },
    });

    for (const entry of existingEmbeddings) {
      if (!entry.embedding) continue;
      const similarity = calculateCosineSimilarity(newEmbedding, entry.embedding);
      if (similarity >= 0.95) return entry; // Se for muito similar, retorna o existente
    }

    return null;
  } catch (error) {
    console.error("Erro ao verificar existência do embedding:", error);
    return null;
  }
};

// Função para armazenar um novo embedding no banco se não existir
const storeEmbeddingIfNotExists = async (sessionId, question) => {
  const existingEmbedding = await findExistingEmbedding(question);
  if (existingEmbedding) {
    console.log("Embedding já existe no banco. Evitando duplicação.");
    return existingEmbedding;
  }

  const newEmbedding = await getEmbedding(question);
  if (!newEmbedding) return null;

  const storedEmbedding = await prisma.userEmbedding.create({
    data: {
      sessionId,
      question,
      embedding: newEmbedding,
    },
  });

  console.log("Novo embedding armazenado com sucesso!");
  return storedEmbedding;
};

// Função para encontrar a instrução mais similar
const findMostSimilarInstruction = async (text) => {
  try {
    const inputEmbedding = await getEmbedding(text);
    if (!inputEmbedding) return null;

    const instructions = await prisma.instructionEmbedding.findMany({
      select: { id: true, instruction: true } // Removido o campo 'embedding' para garantir que não seja retornado
    });

    let bestMatch = null;
    let highestSimilarity = -Infinity;

    for (const instruction of instructions) {
      // Obtém o embedding manualmente para evitar que ele seja retornado no final
      const storedEmbedding = await prisma.instructionEmbedding.findUnique({
        where: { id: instruction.id },
        select: { embedding: true }
      });

      if (!storedEmbedding || !storedEmbedding.embedding) continue;

      const similarity = calculateCosineSimilarity(inputEmbedding, storedEmbedding.embedding);

      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = instruction;
      }
    }

    // Retorna APENAS a instrução e o grau de similaridade
    return highestSimilarity >= 0.75
      ? { instruction: bestMatch.instruction, similarity: highestSimilarity.toFixed(2) }
      : null;
  } catch (error) {
    console.error("Erro ao buscar instrução similar:", error);
    return null;
  }
};

module.exports = { getEmbedding, storeEmbeddingIfNotExists, findMostSimilarInstruction };
