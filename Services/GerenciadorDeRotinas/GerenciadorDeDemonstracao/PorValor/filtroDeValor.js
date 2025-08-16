const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  storeUserResponse
} = require("../../../redisService");
const { pipelineContatoInicial } = require("../../../ServicesKommo/pipelineContatoInicial");
const { pipelineConhecendoALoja } = require("../../../ServicesKommo/pipelineConhecendoALoja");
const { agenteDeDemonstracaoPorValor } = require("./agenteDeDemonstracaoPorValor");
const { registrarOuAtualizarMensagem } = require("../../../GerenciadorDeRotinas/messages/mensagemEnviadaService");
const { identificarModeloPorNome } = require("../PorNome/identificarModeloPorNome");
const { atualizarValorVendaDoLead } = require("../../../ServicesKommo/atualizarValorVendaDoLead");
const { getAllCelulares } = require("../../../dbService");
const { pipelineAtendimentoAI } = require("../../../ServicesKommo/pipelineAtendimentoAI");


// 🔤 Remove prefixo "again"
function limparPrefixoAgain(texto) {
  if (typeof texto === "string" && texto.toLowerCase().startsWith("again ")) {
    return texto.slice(6).trim();
  }
  return texto;
}

// 💰 Verifica se é valor monetário real (ignora RAM/ROM)
function contemValorMonetario(texto) {
  const textoNumerico = texto.replace(/[^\d,\.]/g, "").replace(/\./g, "").replace(",", ".");

  // Ignorar valores como "8GB RAM"
  const regexMemoria = /\b\d{3,6}(\.\d{1,2})?\s?(gb)?\s?(ram|rom)\b/i;
  if (regexMemoria.test(texto)) return false;

  return /\b\d{3,6}(\.\d{1,2})?\b/.test(textoNumerico);
}

// 🧠 Extrai tokens relevantes automaticamente dos modelos do banco
const extrairTokensRelevantes = (modelos) => {
  const tokens = new Set();

  modelos.forEach(modelo => {
    const nome = modelo.nome.toLowerCase().replace(/[^\w\s]/g, "");
    const partes = nome.split(/\s+/);
    partes.forEach(p => {
      if (p.length >= 3 && !/^\d+$/.test(p)) {
        tokens.add(p);
      }
    });
  });

  return Array.from(tokens);
};

// 🔍 Busca modelo mais provável com score ponderado
const buscarModeloPorNome = async (texto) => {
  const modelos = await getAllCelulares();
  const textoNormalizado = texto.toLowerCase().replace(/[^\w\s]/g, "");
  const tokensImportantes = extrairTokensRelevantes(modelos);

  let melhorMatch = null;
  let maiorScore = 0;

  for (const modelo of modelos) {
    const nomeModelo = modelo.nome.toLowerCase().replace(/[^\w\s]/g, "");
    const tokensModelo = nomeModelo.split(/\s+/).filter(token => token.length >= 3);

    let score = 0;

    for (const token of tokensModelo) {
      if (textoNormalizado.includes(token)) {
        const boost = tokensImportantes.includes(token) ? 2 : 1;
        score += boost;
      }
    }

    if (score > maiorScore && score >= 2) {
      melhorMatch = modelo;
      maiorScore = score;
    }
  }

  return melhorMatch;
};

// 🎯 Agente principal de decisão
const filtroDeValor = async ({ sender, msgContent, pushName, messageId }) => {
  try {
    const respostaLimpa = limparPrefixoAgain(msgContent);

    const modeloDetectado = await buscarModeloPorNome(respostaLimpa);
    if (modeloDetectado) {
      await setUserStage(sender, "identificar_modelo_por_nome");

      await pipelineAtendimentoAI({ name: pushName, phone: sender });


      return await identificarModeloPorNome({
        sender,
        msgContent: respostaLimpa,
        pushName
      });
    }

    if (contemValorMonetario(respostaLimpa)) {
      await setUserStage(sender, "agente_de_demonstracao_por_valor");
      await storeUserResponse(sender, "sondagem", "investimento", respostaLimpa);

      await pipelineAtendimentoAI({ name: pushName, phone: sender });


      // 💰 Extrai valor numérico para o campo price
      const valorNumerico = parseFloat(
        respostaLimpa.replace(/[^\d,\.]/g, "").replace(/\./g, "").replace(",", ".")
      );

      if (!isNaN(valorNumerico)) {
        try {
          await atualizarValorVendaDoLead(`${sender}@c.us`, valorNumerico);

        } catch (err) {
          console.warn("⚠️ Falha ao atualizar valor de venda no Kommo:", err.message);
        }
      }

      await registrarOuAtualizarMensagem({
        telefone: sender,
        conteudo: msgContent,
        tipo: "TEXTO",
        mensagemExternaId: messageId,
      });

      return await agenteDeDemonstracaoPorValor({
        sender,
        pushName,
        valorBruto: respostaLimpa
      });
    }

    await setUserStage(sender, "filtro_de_valor");
    return await sendBotMessage(
      sender,
      `🤖 Não encontrei esse modelo. Trabalhamos com Realme, Redmi e Poco. Você pode digitar o nome de outro modelo ou me dizer quanto pretende investir?`
    );
  } catch (error) {
    console.error("❌ Erro na rotinaDeDemonstracaoPorValor:", error);
    await sendBotMessage(
      sender,
      "❌ Ocorreu um erro ao buscar os modelos. Por favor, tente novamente mais tarde."
    );
  }
};

module.exports = { filtroDeValor };