const { sendBotMessage } = require("../../messageSender")

const rotinaDeContinuidade = async (sender, msgContent ) =>{  
   
    const responseMessage2 = "Perfeito! Vamos continuar de onde paramos mas to aqui 😄"
    await sendBotMessage(sender, responseMessage2 )    
  
    return 

};

module.exports = { rotinaDeContinuidade }