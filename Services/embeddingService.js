require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { pipeline } = require("@xenova/transformers");

const prisma = new PrismaClient();

// Carrega o modelo de embeddings localmente apenas uma vez
let embedder = null;
const loadModel = async () => {
  if (!embedder) {
    console.log("🔄 Carregando modelo de embeddings localmente...");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("✅ Modelo carregado com sucesso!");
  }
};

// Função para gerar embeddings localmente
const getEmbedding = async (text) => {
  try {
    await loadModel(); // Garante que o modelo está carregado
    const embedding = await embedder(text, { pooling: "mean", normalize: true });
    
    return Array.from(embedding.data); // Converte para Float[]
  } catch (error) {
    console.error("❌ Erro ao gerar embedding localmente:", error);
    return null;
  }
};

// Função para calcular a similaridade cosseno entre dois vetores
const calculateCosineSimilarity = (vecA, vecB) => {
  const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

// Função para verificar se um embedding já existe no banco (evita duplicação)
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
    console.error("❌ Erro ao verificar existência do embedding:", error);
    return null;
  }
};

// Função para armazenar um novo embedding no banco apenas se não existir
const storeEmbeddingIfNotExists = async (sessionId, question) => {
  try {
    const existingEmbedding = await findExistingEmbedding(question);
    if (existingEmbedding) {
      console.log("ℹ️ Embedding já existe no banco. Evitando duplicação.");
      return existingEmbedding;
    }

    const newEmbedding = await getEmbedding(question);
    if (!newEmbedding) return null;

    const storedEmbedding = await prisma.userEmbedding.create({
      data: {
        sessionId,
        question,
        embedding: newEmbedding, // Agora é um array de floats válido
      },
    });

    console.log("✅ Novo embedding armazenado com sucesso!");
    return storedEmbedding;
  } catch (error) {
    console.error("❌ Erro ao salvar embedding:", error);
    return null;
  }
};

// Função para encontrar a instrução mais similar
const findMostSimilarInstruction = async (text) => {
  try {
    const inputEmbedding = await getEmbedding(text);
    if (!inputEmbedding) return null;

    const instructions = await prisma.instructionEmbedding.findMany({
      select: { id: true, instruction: true }
    });

    let bestMatch = null;
    let highestSimilarity = -Infinity;

    for (const instruction of instructions) {
      // Obtém o embedding da instrução diretamente do banco
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

    if (!bestMatch) {
      console.log("ℹ️ Nenhuma instrução com similaridade suficiente encontrada.");
      return null;
    }

    console.log(`✅ Melhor correspondência encontrada com ${highestSimilarity.toFixed(2) * 100}% de similaridade.`);
    
    return { instruction: bestMatch.instruction, similarity: highestSimilarity.toFixed(2) };
  } catch (error) {
    console.error("❌ Erro ao buscar instrução similar:", error);
    return null;
  }
};

module.exports = { getEmbedding, storeEmbeddingIfNotExists, findMostSimilarInstruction };
