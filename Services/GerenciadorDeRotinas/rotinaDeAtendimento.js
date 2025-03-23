const { sendBotMessage } = require("../messageSender")
const {  deleteUserResponses } = require("../redisService");

const rotinaDeAtedimento = async (sender, msgContent, pushName ) =>{  

    // 🧹 Limpa os dados da rotina de sondagem (mas mantém o stage)
  await deleteUserResponses(sender, "sondagem");

    const responseMessage =   `Oi ${pushName} me chamo Anna do time VERTEX aqui 🙋🏻‍♀️. Vou te ajudar no seu atendimento!`
    await sendBotMessage(sender, responseMessage )
    const responseMessage2 = " Parece que sua sessão foi pausada ⏸️. Quer retomar o atendimento?\nResponda 🤔💬\n👉*SIM* para começar do zero \n🔄*NÃO* para continuar de onde paro"
    await sendBotMessage(sender, responseMessage2 )    
  
    return 

};

module.exports = { rotinaDeAtedimento }