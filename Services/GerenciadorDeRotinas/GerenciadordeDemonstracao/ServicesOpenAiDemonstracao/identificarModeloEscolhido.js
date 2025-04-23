// identificarModeloEscolhido.js
const {
  getChosenModel,
  storeChosenModel,
  setUserStage,
  storeModelosSugeridos
} = require("../../../../Services/redisService");
const { distance } = require("fastest-levenshtein");
const { handlerEscolherModelo } = require("../ServicesOpenAiDemonstracao/handlerEscolherModelo");
const { agenteDeDemonstracaoPorNome } = require("./agenteDeDemonstracaoPorNome");
const { sendBotMessage } = require("../../../messageSender");
const axios = require("axios");
const fs = require("fs");

const REFRESH_TOKEN_PATH = './bling_refresh_token.json';
const CATEGORIA_ID = 11356816;

const getAccessToken = () => {
  if (!fs.existsSync(REFRESH_TOKEN_PATH)) {
    throw new Error('Arquivo bling_refresh_token.json não encontrado.');
  }
  const data = JSON.parse(fs.readFileSync(REFRESH_TOKEN_PATH, 'utf8'));
  return data.access_token;
};

const obterCelularesDoBling = async () => {
  try {
    const token = getAccessToken();
    const response = await axios.get('https://www.bling.com.br/Api/v3/produtos', {
      headers: { Authorization: `Bearer ${token}` },
      params: { idCategoria: CATEGORIA_ID, pagina: 1, limite: 100 }
    });
    return response.data.data.map(p => p.nome.replace(/^smartphone\s*/i, "").trim());
  } catch (err) {
    console.error("❌ Erro ao buscar produtos do Bling:", err.response?.data || err.message);
    return [];
  }
};

function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\u0000-\u007E]/g, "")
    .replace(/[^\w\s]/gi, "")
    .toLowerCase();
}

function limparFrase(texto) {
  return texto
    .replace(/(quero|procuro|gostaria de|to procurando|to a procura de|interessado em|queria ver|quero ver|vendo|vendo um|vendo celular|me mostra|ver|celular|modelo|um|o|a|de|do|da|para|ver|vocês|tem|têm|possui|possuem|temos|mostrar)/gi, "")
    .trim();
}

function tokenizar(texto) {
  return normalizar(texto).split(/\s+/).filter(Boolean);
}

function scoreAvancado(entrada, modelo) {
  const tokensEntrada = tokenizar(entrada);
  const tokensModelo = tokenizar(modelo);

  const palavrasEmComum = tokensEntrada.filter(token => tokensModelo.includes(token));
  const proporcaoComum = palavrasEmComum.length / Math.max(tokensModelo.length, 1);

  const boost = ["motorola", "samsung", "iphone", "realme", "xiaomi", "poco", "note", "blue", "voyage", "plus", "5g"]
    .some(keyword => tokensEntrada.includes(normalizar(keyword))) ? 0.2 : 0;

  const scoreLevenshtein = 1 - (distance(normalizar(entrada), normalizar(modelo)) / Math.max(entrada.length, modelo.length));

  return (scoreLevenshtein + proporcaoComum + boost) / 2;
}

async function identificarModeloEscolhido({ sender, msgContent, pushName }) {
  const entradaOriginalCompleta = await getChosenModel(sender);
  const entradaOriginal = entradaOriginalCompleta.replace(/^again\s+/i, '').trim();
  console.log("🔍 Entrada original:", entradaOriginal);

  const celulares = await obterCelularesDoBling();
  console.log("📦 [DEBUG] Modelos disponíveis do Bling:", celulares);

  if (!celulares.length) {
    console.log("⚠️ [DEBUG] Nenhum modelo retornado da API do Bling.");
    await sendBotMessage(sender, "❌ Não conseguimos acessar os modelos disponíveis no momento. Tente novamente mais tarde.");
    return null;
  }

  const entradaLimpa = limparFrase(entradaOriginal);

  const matches = celulares
    .map(modelo => ({ modelo, score: scoreAvancado(entradaLimpa, modelo) }))
    .sort((a, b) => b.score - a.score);

  const matchesRelevantes = matches.filter(m => m.score >= 0.15);

  console.log("📊 [DEBUG] Matches encontrados:");
  matchesRelevantes.forEach(m => console.log(`→ ${m.modelo} (score: ${m.score.toFixed(3)})`));

  const modeloExato = matchesRelevantes.find(m => normalizar(m.modelo) === normalizar(entradaLimpa));

  if (modeloExato && matchesRelevantes.length === 1) {
    await storeChosenModel(sender, modeloExato.modelo);
    await setUserStage(sender, "agente_de_demonstração_detalhada");
    console.log("🎯 [DEBUG] Modelo EXATO identificado:", modeloExato.modelo);
    return await agenteDeDemonstracaoPorNome({ sender, msgContent, pushName });
  }

  if (matchesRelevantes.length > 1) {
    const nomes = matchesRelevantes.map(m => m.modelo);
    await storeModelosSugeridos(sender, nomes);
    await setUserStage(sender, "escolher_modelo");
    return await handlerEscolherModelo({ sender, msgContent, pushName });
  }

  if (matchesRelevantes.length === 1) {
    const modeloFinal = matchesRelevantes[0].modelo;
    await storeChosenModel(sender, modeloFinal);
    await setUserStage(sender, "sequencia_de_demonstracao_por_nome");
    return await agenteDeDemonstracaoPorNome({ sender, msgContent, pushName });
  }

  await setUserStage(sender, "sondagem_de_celular");
  await sendBotMessage(sender, "❌ Não consegui identificar o modelo. Pode me dizer o nome exato ou alguma característica principal do aparelho?");
  return null;
}

module.exports = { identificarModeloEscolhido };
