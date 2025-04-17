// ServicesOpenAiDemonstracao/identificarModeloEscolhido.js
const {
  getChosenModel,
  storeChosenModel,
  setUserStage, 
  storeModelosSugeridos 
} = require("../../../../Services/redisService");
const { distance } = require("fastest-levenshtein");
const { agenteDeDemonstracaoPorNome } = require("./agenteDeDemonstracaoPorNome");
const { sendBotMessage } = require("../../../messageSender");


const celulares = [
  "Samsung Galaxy A14",
  "Motorola Moto E22",
  "Xiaomi Redmi 12C",
  "Samsung Galaxy M14 5G",
  "Motorola Moto G73 5G",
  "Realme C55",
  "Samsung Galaxy A54 5G",
  "Motorola Edge 40 Neo",
  "iPhone SE (3ª geração)",
  "Xiaomi Poco X6 Pro",
  "Xiaomi Note 14",
  "Realme C61",
  "Note 60",
  "Realme C75"
];


// 🔤 Normaliza o texto
function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\u0000-\u007E]/g, "")
    .replace(/[^\w\s]/gi, "")
    .toLowerCase();
}

// 🧹 Remove palavras irrelevantes da frase
function limparFrase(texto) {
  return texto.replace(
    /(quero|procuro|gostaria de|to procurando|to a procura de|interessado em|queria ver|quero ver|vendo|vendo um|vendo celular|me mostra|ver|celular|modelo)/gi,
    ""
  ).trim();
}

// 🧩 Divide o texto em tokens úteis
function tokenizar(texto) {
  return normalizar(texto).split(/\s+/).filter(Boolean);
}

// 🤖 Calcula um score inteligente de similaridade
function scoreAvancado(entrada, modelo) {
  const tokensEntrada = tokenizar(entrada);
  const tokensModelo = tokenizar(modelo);

  const matchDireto = normalizar(entrada).includes(normalizar(modelo)) || normalizar(modelo).includes(normalizar(entrada));
  if (matchDireto) return 1;

  const palavrasEmComum = tokensEntrada.filter(token => tokensModelo.includes(token));
  const proporcaoComum = palavrasEmComum.length / Math.max(tokensModelo.length, 1);

  const boostKeywords = ["motorola", "moto", "samsung", "iphone", "realme", "xiaomi", "poco"];
  const temBoost = boostKeywords.some(keyword => normalizar(entrada).includes(keyword));

  const scoreLevenshtein = 1 - (distance(normalizar(entrada), normalizar(modelo)) / Math.max(normalizar(entrada).length, normalizar(modelo).length));

  let scoreFinal = (scoreLevenshtein + proporcaoComum) / 2;
  if (temBoost) scoreFinal += 0.1;

  return scoreFinal;
}

// 🎯 Identifica o modelo com base no texto salvo
async function identificarModeloEscolhido({ sender, msgContent, pushName }) {
  const entradaOriginal = await getChosenModel(sender);
  if (!entradaOriginal) {
    console.log("⚠️ [DEBUG] Nenhuma entrada salva encontrada para comparação.");
    return null;
  }

  const entradaLimpa = limparFrase(entradaOriginal);

  const matches = celulares
    .map(modelo => {
      const score = scoreAvancado(entradaLimpa, modelo);
      return { modelo, score };
    })
    .filter(({ score }) => score >= 0.3)
    .sort((a, b) => b.score - a.score);

  if (matches.length > 1) {
    const nomes = matches.map(m => m.modelo);
    await storeModelosSugeridos(sender, nomes);
    await setUserStage(sender, "escolher_modelo");
    await sendBotMessage(sender, `📱 Encontrei mais de um modelo parecido. Qual desses você quer saber mais?\n\n${nomes.map(n => `• ${n}`).join("\n")}`);
    return true;
  }

  if (matches.length === 1) {
    const modeloFinal = matches[0].modelo;
    await storeChosenModel(sender, modeloFinal);
    await setUserStage(sender, "sequencia_de_demonstracao_por_nome");
    console.log("💾 [DEBUG] Modelo identificado e salvo no Redis:", modeloFinal);

    return await agenteDeDemonstracaoPorNome({ sender, msgContent, pushName });
  }

  if (matches.length === 0) {    
    await setUserStage(sender, "sondagem_de_celular");
    console.log("💾 [DEBUG] Mencaminhando para sondagem");
    await await sendBotMessage(sender, "vamos te encaminhar para sondagem para ver o que vc quer então,")

    
  }

  console.log("⚠️ [DEBUG] Nenhum modelo foi identificado com similaridade suficiente.");
  return null;
}

module.exports = { identificarModeloEscolhido };
