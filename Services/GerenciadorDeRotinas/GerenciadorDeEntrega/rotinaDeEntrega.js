const { sendBotMessage } = require("../../messageSender")

const rotinaDeEntrega = async ({sender, msgContent, pushName}) =>{
    
    await sendBotMessage(sender, "to na rotina de entrega")

}

module.exports = { rotinaDeEntrega}