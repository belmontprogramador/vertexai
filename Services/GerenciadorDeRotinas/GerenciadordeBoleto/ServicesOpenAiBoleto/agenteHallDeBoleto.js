const { sendBotMessage } = require("../../../messageSender");
const { setUserStage } = require("../../../redisService");

const agenteHallDeBoleto = async ({ sender, msgContent, pushName }) => {
  // Envia mensagem com template literal para suportar várias linhas
  await sendBotMessage(
    sender,
    `✅ Sim, nós fazemos opção de crediário!\n\n📈 Temos um ÍNDICE ALTÍSSIMO DE APROVAÇÃO, e o melhor: você não precisa comprovar renda.\n\n📱 É uma forma muito bacana de comprar um telefone sem precisar de cartão de crédito.\n\n📝 Para isso, só precisamos de:\n- Uma pequena entrada\n- Um chip ativo\n- Documento de identificação no momento da compra.`
  );
  
  await sendBotMessage(
    sender,
    `Toda análise definitiva é feita em loja! Mas se quiser posso fazer um pré-cadastro aqui que temos uma noção de como fica sua aprovação. O que acha?`
  );

  await sendBotMessage(sender, "Voce gostaria de escolher um modelo ou tirar mais duvidas sobre o boleto?")
  await setUserStage(sender, "agente_de_decisao_hall_de_boletos")
};

module.exports = { agenteHallDeBoleto };
