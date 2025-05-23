const { sendBotMessage } = require ('../../messageSender')
const {
    setLastInteraction,
    setUserStage,
    getUserStage,
    storeUserResponse,
    getUserResponses,
    getUserChatHistory
  } = require('../../redisService');

    const rotinaDeAgendamento = async({sender, msgContent, pushName}) => {
    await setUserStage("agendamento")
    await sendBotMessage(sender, "Para quando você esta planejando sua compra")
};

module.exports = { rotinaDeAgendamento }