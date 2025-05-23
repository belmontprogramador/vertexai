const { sendBotMessage } = require("../../../messageSender");
const { setUserStage, getNomeUsuario} = require('../../../redisService');

const { pipelineBoleto } = require("../../../ServicesKommo/pipelineBoleto");

const rotinaDeBoleto = async ({ sender, msgContent, pushName }) => {

  const nome = await getNomeUsuario(sender);

  try {  
    // Cria ou move o lead no Kommo
    await pipelineBoleto({
      name: `Lead Boleto - ${pushName}`,
      phone: `+${sender}`
    });

    // Envia mensagem com template literal para suportar várias linhas
    await sendBotMessage(
      sender,
      `Sim ${nome} fazemos opção de crediário! Temos um *ÍNDICE ALTÍSSIMO DE APROVAÇÃO*. Não precisa de renda comprovada, é uma forma muito bacana de comprar um telefone sem ter cartão de crédito. 

Só precisamos de uma pequena entrada, um Chip e documento de identificação na hora da compra.`
    );   

    await sendBotMessage(
      sender,
      `Toda análise definitiva é feita em loja! Mas se quiser posso fazer um pré cadastro aqui que temos uma noção de como fica sua aprovação. O que acha?`
    );

    await sendBotMessage(
    sender,
    `🔍 Para começar sua análise e liberar condições, preciso destes dados:\n• Nome completo ✍\n• CPF 🔢\n• Endereço 🏠\nAssim corremos com sua aprovação rapidinho! 💜`
    );

    return await setUserStage(sender, "open_ai_services_boleto_decisao_2");
  } catch (error) {
    console.error("❌ Erro na rotina de boleto:", error.message);
    await sendBotMessage(sender, "❌ Ocorreu um erro ao iniciar o atendimento de boleto. Por favor, tente novamente mais tarde.");
  }
};

module.exports = { rotinaDeBoleto };