const { sendBotMessage } = require("../../messageSender");
const { openAiServicesBoleto } = require("./ServicesOpenAiBoleto/openAiServicesBoleto");
const {
  setLastInteraction,
  setUserStage,
  getUserStage,
  storeUserResponse,
  getUserResponses,
  getUserChatHistory
} = require('../../redisService');

const { pipelineBoleto } = require("../../ServicesKommo/pipelineBoleto");

const rotinaDeBoleto = async ({ sender, msgContent, pushName }) => {
  try {
    // Atualiza o estágio no Redis
    await setUserStage(sender, "boleto");
    await setLastInteraction(sender, Date.now());

    // Cria ou move o lead no Kommo
    await pipelineBoleto({
      name: `Lead Boleto - ${pushName}`,
      phone: `+${sender}`
    });

    // envia ma mensagem seta stage ia de boleto e da um return

    // Inicia a conversa com IA
    await openAiServicesBoleto(sender, msgContent, pushName);
  } catch (error) {
    console.error("❌ Erro na rotina de boleto:", error.message);
    await sendBotMessage(sender, "❌ Ocorreu um erro ao iniciar o atendimento de boleto. Por favor, tente novamente mais tarde.");
  }
};

module.exports = { rotinaDeBoleto };
