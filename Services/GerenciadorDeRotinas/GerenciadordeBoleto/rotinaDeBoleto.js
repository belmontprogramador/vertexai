const { sendBotMessage } = require("../../messageSender");

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
    await sendBotMessage(sender, "Se você quer comprar seu celular mesmo sem cartão de crédito, eu tenho uma solução perfeita: o **financiamento via PayJoy**! 💳✨")
    await sendBotMessage(sender, "🔓 Você paga uma entrada + parcelas acessíveis, e o próprio aparelho serve como garantia.")
    await sendBotMessage(sender, "Temos um alto indice de aprovação.")
    await sendBotMessage(sender, "Me manda seus dados *CPF, NOME e DATA DE NASCIMENTO*, para eu fazer uma pré analise")
    return await setUserStage(sender, "boleto_agente");
    
  } catch (error) {
    console.error("❌ Erro na rotina de boleto:", error.message);
    await sendBotMessage(sender, "❌ Ocorreu um erro ao iniciar o atendimento de boleto. Por favor, tente novamente mais tarde.");
  }
};

module.exports = { rotinaDeBoleto };
