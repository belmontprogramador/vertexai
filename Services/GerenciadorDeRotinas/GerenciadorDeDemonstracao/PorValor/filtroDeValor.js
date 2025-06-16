const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  storeUserResponse
} = require("../../../redisService");
const { pipelineConhecendoALoja } = require("../../../ServicesKommo/pipelineConecendoALoja");
const { agenteDeDemonstracaoPorValor } = require("./agenteDeDemonstracaoPorValor");
const { registrarOuAtualizarMensagem } = require("../../../GerenciadorDeRotinas/messages/mensagemEnviadaService");
const { identificarModeloPorNome } = require("../PorNome/identificarModeloPorNome");
const { getAllCelulares } = require("../../../dbService");

// 🔤 Remove prefixo "again"
function limparPrefixoAgain(texto) {
  if (typeof texto === "string" && texto.toLowerCase().startsWith("again ")) {
    return texto.slice(6).trim();
  }
  return texto;
}

// 💰 Verifica se o texto tem valor monetário (ex: "1800", "1.200", "R$2000")
function contemValorMonetario(texto) {
  const textoNumerico = texto.replace(/[^\d,\.]/g, "").replace(/\./g, "").replace(",", ".");
  return /\b\d{3,6}(\.\d{1,2})?\b/.test(textoNumerico);
}

// 🔍 Verifica se o texto menciona um modelo
const contemNomeDeModelo = async (texto) => {
  const modelos = await getAllCelulares();
  const textoNormalizado = texto.toLowerCase().replace(/[^\w\s]/g, ""); // limpa pontuação

  return modelos.some(m => {
    const nomeModelo = m.nome.toLowerCase().replace(/[^\w\s]/g, "");
    const tokensModelo = nomeModelo.split(/\s+/); // divide modelo em palavras
  
    return tokensModelo.some(token => {
      return token.length >= 3 && textoNormalizado.includes(token);
    });
  });
  
};

// 🎯 Agente principal de decisão
const filtroDeValor = async ({ sender, msgContent, pushName, messageId }) => {
  try {
    const respostaLimpa = limparPrefixoAgain(msgContent);

    if (contemValorMonetario(respostaLimpa)) {
      // 💸 Fluxo por valor
      await setUserStage(sender, "agente_de_demonstraçao_por_valor");
      await storeUserResponse(sender, "sondagem", "investimento", respostaLimpa);
      await pipelineConhecendoALoja(`+${sender}`);

      await registrarOuAtualizarMensagem({
        telefone: sender,
        conteudo: msgContent,
        tipo: "TEXTO",
        mensagemExternaId: messageId,
      });

      return await agenteDeDemonstracaoPorValor({ sender, pushName, valorBruto: respostaLimpa });
    }

    if (await contemNomeDeModelo(respostaLimpa)) {
      // 📱 Fluxo por nome de modelo
      return await identificarModeloPorNome({
        sender,
        msgContent: respostaLimpa,
        pushName
      });
    }

    // ❓ Se não for nem valor nem modelo, responde com fallback
    await sendBotMessage(sender, "Não entendi se você quer buscar por valor ou por modelo. Pode me dar mais detalhes?");
  } catch (error) {
    console.error("❌ Erro na rotinaDeDemonstracaoPorValor:", error);
    await sendBotMessage(sender, "❌ Ocorreu um erro ao buscar os modelos. Por favor, tente novamente mais tarde.");
  }
};

module.exports = { filtroDeValor };
