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

    // Envia mensagem com template literal para suportar várias linhas
    await sendBotMessage(
      sender,
      `✅ Sim, nós fazemos opção de crediário!\n\n📈 Temos um ÍNDICE ALTÍSSIMO DE APROVAÇÃO, e o melhor: você não precisa comprovar renda.\n\n📱 É uma forma muito bacana de comprar um telefone sem precisar de cartão de crédito.\n\n📝 Para isso, só precisamos de:\n- Uma pequena entrada\n- Um chip ativo\n- Documento de identificação no momento da compra.`
    );
    

    await sendBotMessage(
      sender,
      `Toda análise definitiva é feita em loja! Mas se quiser posso fazer um pré-cadastro aqui que temos uma noção de como fica sua aprovação. O que acha?`
    );

    return await setUserStage(sender, "boleto_agente");
  } catch (error) {
    console.error("❌ Erro na rotina de boleto:", error.message);
    await sendBotMessage(sender, "❌ Ocorreu um erro ao iniciar o atendimento de boleto. Por favor, tente novamente mais tarde.");
  }
};

module.exports = { rotinaDeBoleto };
