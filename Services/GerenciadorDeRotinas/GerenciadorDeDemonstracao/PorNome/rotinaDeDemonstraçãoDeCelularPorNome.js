const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  appendToConversation
} = require("../../../redisService"); 
const { identificarModeloPorNome } = require("./identificarModeloPorNome");
const { pipelineAtendimentoAI } = require("../../../ServicesKommo/pipelineAtendimentoAI"); // mantém o nome do arquivo


const rotinaDeDemonstracaoDeCelularPorNome = async ({ sender, msgContent, pushName }) => {
  try {
    await setUserStage(sender, "identificar_modelo_por_nome");

    // 🧠 Grava a primeira entrada no histórico
    const entradaAtual = (msgContent?.mensagemOriginal || msgContent?.frase || msgContent?.termosRelacionados || msgContent || "")
    .toString()
    .trim();  
     

    await pipelineAtendimentoAI({ name: pushName || "Lead WhatsApp", phone: sender });


    return await identificarModeloPorNome({ sender, msgContent, pushName });

  } catch (error) {
    console.error("❌ Erro na rotinaDeDemonstracaoDeCelularPorNome:", error);
    await sendBotMessage(sender, "⚠️ Ocorreu um problema ao iniciar a demonstração. Pode tentar novamente?");
  }
};

module.exports = { rotinaDeDemonstracaoDeCelularPorNome };
