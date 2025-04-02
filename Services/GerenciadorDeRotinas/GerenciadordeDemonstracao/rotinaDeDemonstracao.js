const { sendBotMessage } = require("../../messageSender");
const { setLastInteraction, getUserStage, setStageHistory, setUserStage } = require("../../redisService");
const { pipelineConhecendoALoja } = require("../../ServicesKommo/pipelineConecendoALoja");
const { agenteDeDemonstracaoPorValor } = require("../GerenciadordeDemonstracao/ServicesOpenAiDemonstracao/agenteDeDemonstracaoPorValor");

const rotinaDeDemonstracao = async ({ sender, msgContent, produto, finalidadeUso, investimento, pushName }) => {
  try {
    const currentTime = Date.now();
    await setLastInteraction(sender, currentTime);

    const stageAtual = await getUserStage(sender);
    await setStageHistory(sender, stageAtual);
    await setUserStage(sender, "sequencia_de_demonstracao");

    await pipelineConhecendoALoja(`+${sender}`);
    await agenteDeDemonstracaoPorValor({ sender, msgContent, produto, finalidadeUso, investimento, pushName });
  } catch (error) {
    console.error("❌ Erro na rotinaDeDemonstracao:", error);
    await sendBotMessage(sender, "❌ Ocorreu um erro ao iniciar a demonstração. Tente novamente mais tarde.");
  }
};

module.exports = { rotinaDeDemonstracao };