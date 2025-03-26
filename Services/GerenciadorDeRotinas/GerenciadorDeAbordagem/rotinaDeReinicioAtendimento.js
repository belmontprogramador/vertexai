const { sendBotMessage } = require("../../messageSender");
// ❌ Remover deleteUserResponses aqui para preservar os dados
// const { deleteUserResponses } = require("../../redisService");

const rotinaDeReincioAtedimento = async (sender, msgContent, pushName) => {
  // const responseMessage = `Oi ${pushName}, Anna do time VERTEX aqui 🙋🏻‍♀️. Vou te ajudar no seu atendimento!`;
  // console.log("📤 Enviando mensagem de reinício:", responseMessage);
  // await sendBotMessage(sender, responseMessage);

  const responseMessage2 =
    `Oi ${pushName}. Parece que sua sessão foi pausada ⏸️. Quer retomar o atendimento?\nResponda 🤔💬\n👉 *SIM* para começar do zero \n🔄 *NÃO* para continuar de onde paro`;
  await sendBotMessage(sender, responseMessage2);

  return;
};

module.exports = { rotinaDeReincioAtedimento };
