const {
    getUserStage,
    setUserStage,
    getChosenModel
  } = require("../../../redisService");
  
  const { sendBotMessage } = require("../../../messageSender");
  const { identificarModeloEscolhido } = require("./identificarModeloEscolhido");
  
  const verificarEChamarIdentificador = async ({ sender, msgContent, pushName }) => {
    try {
      const stageAtual = await getUserStage(sender);
  
      console.log(`🧠 Verificando estágio: ${stageAtual}`);
  
      if (stageAtual === "identificar_modelo") {
        return await identificarModeloEscolhido({ sender, msgContent, pushName });
      }
  
      return await sendBotMessage(sender, "❌ Você não está na etapa de escolha de modelo. Vamos voltar para o começo?");
    } catch (error) {
      console.error("❌ Erro ao verificar estágio e chamar identificador:", error.message);
      return await sendBotMessage(sender, "❌ Ocorreu um erro ao continuar a demonstração. Tente novamente.");
    }
  };
  
  module.exports = { verificarEChamarIdentificador };
  