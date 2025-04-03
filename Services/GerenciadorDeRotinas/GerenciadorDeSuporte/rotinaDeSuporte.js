const { sendBotMessage } = require("../../messageSender")
const { getUserStage, setUserStage} = require("../../redisService");

const rotinaDeSuporte = async({ sender, msgContent, pushName }) =>{
    console.log("entrei em suporte")
    await getUserStage(sender, "suporte")
    await sendBotMessage(sender, `❓ Oi ${pushName}, poderia dar mais detalhes sobre sua dúvida para que eu possa te ajudar melhor?`);
    return setUserStage(sender, "compactador_de_suporte")
}

module.exports = { rotinaDeSuporte }