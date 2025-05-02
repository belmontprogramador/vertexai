const {
  getChosenModel,
  storeChosenModel,
  setUserStage,
  storeModelosSugeridos
} = require("../../../../Services/redisService");

const { agenteDeDemonstraçãoDetalhada } = require("./agenteDeDemonstraçãoDetalhada");
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

const normalizar = (texto) => {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\u0000-\u007E]/g, "")
    .replace(/[^\w\s]/gi, "")
    .toLowerCase();
};

const tokenizar = (texto) => {
  return normalizar(texto).split(/\s+/).filter(Boolean);
};

async function identificarModeloEscolhido({ sender, msgContent, pushName }) {
  const entradaOriginalCompleta = await getChosenModel(sender);
  const entradaOriginal = entradaOriginalCompleta.replace(/^again\s+/i, '').trim();
  console.log("📥 Entrada original:", entradaOriginal);

  const celulares = await obterCelularesDoBling();
  if (!celulares.length) {
    await sendBotMessage(sender, "❌ Não conseguimos acessar os modelos disponíveis no momento. Tente novamente mais tarde.");
    return null;
  }
  console.log("📦 Modelos disponíveis:", celulares);

  const tokensEntrada = tokenizar(entradaOriginal);
  console.log("🧠 Tokens entrada:", tokensEntrada);

  const matches = celulares.map((modelo) => {
    const tokensModelo = tokenizar(modelo);
    const comuns = tokensEntrada.filter(token => tokensModelo.includes(token));
    const relevancia = comuns.length / Math.max(tokensEntrada.length, 1);
    return { modelo, relevancia };
  }).filter(m => m.relevancia > 0.3);

  if (matches.length === 0) {
    await setUserStage(sender, "sondagem_de_celular");
    await sendBotMessage(sender, "❌ Não consegui identificar o modelo. Pode me dizer o nome exato ou alguma característica principal do aparelho?");
    return null;
  }

  const melhorMatch = matches.sort((a, b) => b.relevancia - a.relevancia)[0];
  console.log("✅ Melhor match:", melhorMatch.modelo);

  if (matches.length > 1) {
    const sugeridos = matches.map(m => m.modelo);
    await storeModelosSugeridos(sender, sugeridos);
  }

  await storeChosenModel(sender, melhorMatch.modelo);
  return await agenteDeDemonstraçãoDetalhada({ sender, msgContent, pushName });
}

module.exports = { identificarModeloEscolhido };