const { sendBotMessage } = require("../../messageSender");
const {
  setUserStage,
  storeUserResponse
} = require("../../redisService");
const { pipelineConhecendoALoja } = require("../../ServicesKommo/pipelineConecendoALoja");
const { agenteDeDemonstracaoPorValor } = require("./ServicesOpenAiDemonstracao/agenteDeDemonstracaoPorValor");

const rotinaDeDemonstracaoPorValor = async ({ sender, msgContent, pushName }) => {
  try {
    // Define o stage atual do usuário
    await setUserStage(sender, "agente_de_demonstraçao_por_valor");

    // Armazena o valor informado pelo usuário dentro da rotina de sondagem
    await storeUserResponse(sender, "sondagem", "investimento", msgContent);

    // Atualiza o lead para o estágio "Conhecendo a loja"
    await pipelineConhecendoALoja(`+${sender}`);

    // Chama o agente que mostra os modelos por faixa de valor
    return await agenteDeDemonstracaoPorValor({ sender, pushName });
  } catch (error) {
    console.error("❌ Erro na rotinaDeDemonstracaoPorValor:", error);
    await sendBotMessage(sender, "❌ Ocorreu um erro ao mostrar os modelos por valor. Por favor, tente novamente mais tarde.");
  }
};

module.exports = { rotinaDeDemonstracaoPorValor };
