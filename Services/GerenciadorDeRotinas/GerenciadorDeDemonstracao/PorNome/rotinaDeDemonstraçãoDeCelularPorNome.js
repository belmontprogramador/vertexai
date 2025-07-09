const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  appendToConversation
} = require("../../../redisService");
const { pipelineConhecendoALoja } = require("../../../ServicesKommo/pipelineConhecendoALoja");
const { identificarModeloPorNome } = require("./identificarModeloPorNome");

const rotinaDeDemonstracaoDeCelularPorNome = async ({ sender, msgContent, pushName }) => {
  try {
    await setUserStage(sender, "identificar_modelo_por_nome");

    // 🧠 Grava a primeira entrada no histórico
    const entradaAtual = (msgContent?.mensagemOriginal || msgContent?.frase || msgContent?.termosRelacionados || msgContent || "")
    .toString()
    .trim();  
     

    // 🗂️ Move o lead no funil do Kommo
    await pipelineConhecendoALoja(`+${sender}`);

    return await identificarModeloPorNome({ sender, msgContent, pushName });

  } catch (error) {
    console.error("❌ Erro na rotinaDeDemonstracaoDeCelularPorNome:", error);
    await sendBotMessage(sender, "⚠️ Ocorreu um problema ao iniciar a demonstração. Pode tentar novamente?");
  }
};

module.exports = { rotinaDeDemonstracaoDeCelularPorNome };
