const { sendBotMessage } = require("../../messageSender");
const { setUserStage } = require("../../redisService");
const { rotinaDeSondagem } = require("../GerenciadorDeSondagem/rotinaDeSondagemDeCelular");

const rotinaDeAtedimentoInicial = async (sender, msgContent, pushName) => {
  const responseMessage = `Oi ${pushName} Anna do time VERTEX aqui 🙋🏻‍♀️. Vou te ajudar no seu atendimento!`;
  
  console.log("📤 Enviando mensagem de atendimento inicial", responseMessage);
  await sendBotMessage(sender, responseMessage);

  // 🟢 Define o stage para iniciar a sondagem
  await setUserStage(sender, "sondagem");

  // 🚀 Chama rotina de sondagem já com mensagem em branco
  return await rotinaDeSondagem({ sender, msgContent: "", pushName });
};

module.exports = { rotinaDeAtedimentoInicial };
