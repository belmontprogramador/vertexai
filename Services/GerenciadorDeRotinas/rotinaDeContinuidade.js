const { sendBotMessage } = require("../messageSender")

const rotinaDeContinuidade = async (sender, msgContent ) =>{  

    const responseMessage = " Oi me chamo Anna do time VERTEX aqui 🙋🏻‍♀️. Vou te ajudar no seu atendimento!"
    await sendBotMessage(sender, responseMessage )
    const responseMessage2 = " Parece que sua sessão foi pausada ⏸️. Quer retomar o atendimento?\nResponda 🤔💬\n👉*SIM* para começar do zero \n🔄*NÃO* para continuar de onde paro"
    await sendBotMessage(sender, responseMessage2 )    
  
    return 

};

module.exports = { rotinaDeContinuidade }