// Services/rotinaDeCapturaDeIntencaoDeUso.js

const { setUserStage,storeIntencaoDeUso } = require("../../redisService");
const { agenteDeDemonstracaoDetalhada } = require("./ServicesOpenAiDemonstracao/agenteDeDemonstraçãoDetalhada");

const rotinaDeCapturaDeIntencaoDeUso = async ({ sender, msgContent, pushName }) => {
  try {
    // 🔄 Armazena a mensagem diretamente como intenção de uso
    await storeIntencaoDeUso(sender, msgContent.trim());

    // 🤖 Em seguida, chama o agente de demonstração detalhada
    await setUserStage(sender, "agente_de_demonstração_detalhado")
    return await agenteDeDemonstracaoDetalhada({ sender, msgContent, pushName });

  } catch (error) {
    console.error("❌ Erro na rotinaDeCapturaDeIntencaoDeUso:", error);
  }
};

module.exports = { rotinaDeCapturaDeIntencaoDeUso };
