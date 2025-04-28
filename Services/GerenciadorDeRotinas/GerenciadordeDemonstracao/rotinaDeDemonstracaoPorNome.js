const { sendBotMessage } = require("../../messageSender");
const { setUserStage, storeChosenModel } = require("../../redisService");
const { pipelineConhecendoALoja } = require("../../ServicesKommo/pipelineConecendoALoja");
const { identificarModloEscolhido } = require("./ServicesOpenAiDemonstracao/identificarModeloEscolhido")

const rotinaDeDemonstracaoPorNome = async ({sender, msgContent, pushName}) => {
  try {     
    await setUserStage(sender, "identificar_modelo");

    // Salva o modelo digitado pelo usuário para referência futura
    const modeloDigitado = msgContent
    await storeChosenModel(sender, modeloDigitado);

    await pipelineConhecendoALoja(`+${sender}`);
    
    return await identificarModloEscolhido({ sender, msgContent, pushName });

  } catch (error) {
    console.error("❌ Erro na rotinaDeDemonstracao:", error);
    await sendBotMessage(sender, "  Ocorreu um erro ao iniciar a demonstração. Tente novamente mais tarde.");
  }
};

module.exports = { rotinaDeDemonstracaoPorNome };
