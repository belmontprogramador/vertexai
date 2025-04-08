const {
  setLastInteraction,
  setUserStage,
  getUserStage,
  storeUserResponse,
  getUserResponses
} = require('../../redisService');

const { sendBotMessage } = require("../../messageSender");
 

const rotinaDeFechamento = async ({ sender, msgContent, produto, finalidadeUso, investimento, pushName }) => {
 await sendBotMessage(sender, `${pushName} para que seu atendimento seja top aqui na loja`)
 await sendBotMessage(sender, `fala pra mim qual a forma de pagamento te interssa, PIX, Cartão ou Boleto?`)
 return await setUserStage(sender, "agente_de_pagamento")
};

module.exports = { rotinaDeFechamento };
