const {
  getModelosSugeridos,
  storeChosenModel,
  setUserStage
} = require("../../../redisService");
const { agenteDeDemonstracaoPorNome } = require("./agenteDeDemonstracaoPorNome");
const { sendBotMessage } = require("../../../messageSender");
const { distance } = require("fastest-levenshtein");

function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\u0000-\u007E]/g, "")
    .replace(/[^\w\s]/gi, "")
    .toLowerCase();
}

function limparFrase(texto) {
  return texto.replace(
    /(quero|procuro|gostaria de|to procurando|to a procura de|interessado em|queria ver|quero ver|vendo|vendo um|vendo celular)/gi,
    ""
  ).trim();
}

function similaridadeLevenshtein(a, b) {
  const normA = normalizar(a);
  const normB = normalizar(b);
  const dist = distance(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
  return 1 - dist / maxLen;
}

const handlerEscolherModelo = async ({ sender, pushName, msgContent }) => {
  const modelosSugeridos = await getModelosSugeridos(sender);
  if (!modelosSugeridos || modelosSugeridos.length === 0) {
    await sendBotMessage(sender, "❌ Não encontrei os modelos sugeridos. Pode me dizer o nome do modelo novamente?");
    return;
  }

  const entradaLimpa = limparFrase(msgContent);
  const entradaNormalizada = normalizar(entradaLimpa);

  const matches = modelosSugeridos
    .map(modelo => {
      const modeloNormalizado = normalizar(modelo);
      let score = similaridadeLevenshtein(entradaLimpa, modelo);

      if (
        entradaNormalizada.includes(modeloNormalizado) ||
        modeloNormalizado.includes(entradaNormalizada)
      ) {
        score = 1;
      }

      const boostKeywords = ["motorola", "moto", "samsung", "iphone", "realme", "xiaomi", "poco"];
      const temBoost = boostKeywords.some(p => entradaNormalizada.includes(p));
      const scoreFinal = temBoost ? score + 0.1 : score;

      return { modelo, score: scoreFinal };
    })
    .filter(({ score }) => score >= 0.3)
    .sort((a, b) => b.score - a.score);

  if (matches.length === 0) {
    await sendBotMessage(sender, "🤔 Não consegui identificar exatamente qual modelo você quer. Pode digitar o nome completo?");
    return;
  }

  const melhorMatch = matches[0];

  await storeChosenModel(sender, melhorMatch.modelo);
  await setUserStage(sender, "agente_de_demonstraçao_por_nome");

  return await agenteDeDemonstracaoPorNome({ sender, msgContent, pushName });
};

module.exports = { handlerEscolherModelo };
