const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  storeUserResponse
} = require("../../../redisService");
const { pipelineConhecendoALoja } = require("../../../ServicesKommo/pipelineConecendoALoja");
const { agenteDeDemonstracaoPorValor } = require("./agenteDeDemonstracaoPorValor");
const { registrarOuAtualizarMensagem } = require("../../../GerenciadorDeRotinas/messages/mensagemEnviadaService");

// 🔤 Remove o prefixo "again" da mensagem, se existir
function limparPrefixoAgain(texto) {
  if (typeof texto === "string" && texto.toLowerCase().startsWith("again ")) {
    return texto.slice(6).trim();
  }
  return texto;
}

const filtroDeValor = async ({ sender, msgContent, pushName,  messageId}) => {
  try {
    await setUserStage(sender, "agente_de_demonstraçao_por_valor");

    const respostaLimpa = limparPrefixoAgain(msgContent);

    await storeUserResponse(sender, "sondagem", "investimento", respostaLimpa);
    await pipelineConhecendoALoja(`+${sender}`);

    // 🧠 Grava ou atualiza no banco a mensagem do usuário
    await registrarOuAtualizarMensagem({
      telefone: sender,                      // sender já é o número
      conteudo: msgContent,                  // msgContent é o texto do usuário
      tipo: "TEXTO",
      mensagemExternaId: messageId,
    });   
    

    return await agenteDeDemonstracaoPorValor({ sender, pushName, valorBruto: respostaLimpa });
  } catch (error) {
    console.error("❌ Erro na rotinaDeDemonstracaoPorValor:", error);
    await sendBotMessage(sender, "❌ Ocorreu um erro ao mostrar os modelos por valor. Por favor, tente novamente mais tarde.");
  }
};

module.exports = { filtroDeValor };
