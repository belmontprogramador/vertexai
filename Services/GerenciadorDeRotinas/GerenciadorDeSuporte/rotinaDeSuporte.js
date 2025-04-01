const { sendBotMessage } = require("../../messageSender")

const rotinaDeSuporte = async(sender, msgContent, pushName) =>{
    console.log("entrei em suporte")
    await sendBotMessage(sender, `❓ Oi ${pushName}, poderia dar mais detalhes sobre sua dúvida para que eu possa te ajudar melhor?`);
    await sendBotMessage("5522988751744", "tem gente querendo suporte")

}

module.exports = { rotinaDeSuporte }