const { sendBotMessage } = require("../../../messageSender");
const { setUserStage, getNomeUsuario} = require('../../../redisService');
const { pipelineAtendimentoAIBoleto } = require("../../../ServicesKommo/pipelineAtendimentoAIBoleto"); // ajuste o caminho se necessário

 

const rotinaDeBoleto = async ({ sender, msgContent, pushName }) => {

  const nome = await getNomeUsuario(sender);

  try { 

    await pipelineAtendimentoAIBoleto({
      name: pushName || nome || "Cliente",
      phone: sender
    });
    
    // await pipelineBoleto(sender.startsWith("+") ? sender : `+${sender}`);

    await sendBotMessage(sender, {
      imageUrl: "https://imagensvertex.felipebelmont.com/wp-content/uploads/2025/06/Imagem-do-WhatsApp-de-2025-06-05-as-18.10.01_9a71d5d5.jpg", // coloque sua URL real aqui
      caption:`Sim ${nome} fazemos opção de crediário! Temos um *ÍNDICE ALTÍSSIMO DE APROVAÇÃO*. Não precisa de renda comprovada, é uma forma muito bacana de comprar um telefone sem ter cartão de crédito. 

Só precisamos de uma pequena entrada, um Chip e documento de identificação na hora da compra.`
    });
    
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      await delay(2000);       

    await sendBotMessage(
      sender,
      `Toda análise definitiva é feita em loja! Mas se quiser posso fazer um pré cadastro aqui que temos uma noção de como fica sua aprovação. O que acha?`
    );

    await sendBotMessage(
    sender,
    `🔍 Para começar sua análise e liberar condições, preciso destes dados:\n• Nome completo ✍\n• CPF 🔢\n• Data de nascimento 🏠\nAssim corremos com sua aprovação rapidinho! 💜`
    );

    return await setUserStage(sender, "open_ai_services_boleto_decisao_2");
  } catch (error) {
    console.error("❌ Erro na rotina de boleto:", error.message);
    await sendBotMessage(sender, "❌ Ocorreu um erro ao iniciar o atendimento de boleto. Por favor, tente novamente mais tarde.");
  }
};

module.exports = { rotinaDeBoleto };