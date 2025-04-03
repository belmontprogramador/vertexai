const { sendBotMessage } = require("../../messageSender")
const { getUserStage} = require("../../redisService");

const compactadorDeSuporte = async({ sender, msgContent, pushName }) =>{
    console.log("entrei no compactador_de_suporte")
    await getUserStage(sender, "compactador_de_suporte")    
    await sendBotMessage("5522988751744", `Ola aqui é Anna assistente virtual\nO usuario *${pushName}*, com telefone *${sender}*, enviou essa mensagem querendo suporte "*${msgContent}*" `)
    await sendBotMessage("5522988751744", `Entre em contato com ele assim que possível`)
    return await sendBotMessage(sender, `Opa ${pushName}  sua mensagem foi encaminhada para o suporte. Vamos responder dentro de alguns minutos. Obg`)
}

module.exports = { compactadorDeSuporte }