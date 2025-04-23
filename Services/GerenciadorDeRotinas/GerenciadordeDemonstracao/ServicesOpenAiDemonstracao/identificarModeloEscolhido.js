const {
  getChosenModel,
  storeChosenModel,
  setUserStage,
  storeModelosSugeridos
} = require("../../../../Services/redisService");
const { distance } = require("fastest-levenshtein");
const { agenteDeDemonstracaoDetalhada } = require("../ServicesOpenAiDemonstracao/agenteDeDemonstraçãoDetalhada");
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
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        idCategoria: CATEGORIA_ID,
        pagina: 1,
        limite: 100
      }
    });
    return response.data.data.map(p => p.nome);
  } catch (err) {
    console.error("❌ Erro ao buscar produtos do Bling:", err.response?.data || err.message);
    return [];
  }
};

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
    /(quero|procuro|gostaria de|to procurando|to a procura de|interessado em|queria ver|quero ver|vendo|vendo um|vendo celular|me mostra|ver|celular|modelo)/gi,
    ""
  ).trim();
}

function tokenizar(texto) {
  return normalizar(texto).split(/\s+/).filter(Boolean);
}

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

// 🧠 Identifica o prefixo comum entre múltiplas strings
function encontrarPrefixoComum(strs) {
  if (!strs.length) return '';
  let prefix = strs[0];
  for (let i = 1; i < strs.length; i++) {
    while (strs[i].indexOf(prefix) !== 0) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return '';
    }
  }
  return prefix;
}

async function identificarModeloEscolhido({ sender, msgContent, pushName }) {
  const entradaOriginalCompleta = await getChosenModel(sender);
  const entradaOriginal = entradaOriginalCompleta.replace(/^again\s+/i, "").trim();

  const celulares = await obterCelularesDoBling();
  if (!celulares.length) {
    console.log("⚠️ [DEBUG] Nenhum modelo retornado da API do Bling.");
    await sendBotMessage(sender, "❌ Não conseguimos acessar os modelos disponíveis no momento. Tente novamente mais tarde.");
    return null;
  }

  // Comparação direta
  const modeloExato = celulares.find((modelo) => {
    return normalizar(modelo) === normalizar(entradaOriginal);
  });

  if (modeloExato) {
    await storeChosenModel(sender, modeloExato);
    await setUserStage(sender, "agente_de_demonstração_detalhada");
    console.log("🎯 [DEBUG] Modelo EXATO identificado:", modeloExato);
    return await agenteDeDemonstracaoDetalhada({ sender, msgContent, pushName });
  }

  const entradaLimpa = limparFrase(entradaOriginal);

  const matches = celulares
    .map(modelo => {
      const score = scoreAvancado(entradaLimpa, modelo);
      return { modelo, score };
    })
    .filter(({ score }) => score >= 0.3)
    .sort((a, b) => b.score - a.score);

  // NOVO: detectar prefixo comum em matches com score alto
  const matchesAltos = matches.filter(m => m.score >= 0.8);
  const prefixoComum = matchesAltos.length > 1
    ? encontrarPrefixoComum(matchesAltos.map(m => m.modelo))
    : null;

  if (prefixoComum && prefixoComum.length >= 10) {
    const modeloFinal = prefixoComum.trim();
    console.log("🔍 [DEBUG] Prefixo comum detectado, encaminhando para demonstração detalhada:", modeloFinal);
    await storeChosenModel(sender, modeloFinal);
    await setUserStage(sender, "agente_de_demonstração_detalhada");
    return await agenteDeDemonstracaoDetalhada({ sender, msgContent, pushName });
  }

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

  await setUserStage(sender, "sondagem_de_celular");
  console.log("⚠️ [DEBUG] Nenhum modelo foi identificado com similaridade suficiente.");
  await sendBotMessage(sender, "❌ Não consegui identificar o modelo. Pode me dizer o nome exato ou alguma característica principal do aparelho?");
  return null;
}

module.exports = { identificarModeloEscolhido };
