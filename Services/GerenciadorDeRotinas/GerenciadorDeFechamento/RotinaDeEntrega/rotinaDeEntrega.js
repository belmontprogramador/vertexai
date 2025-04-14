const { sendBotMessage } = require("../../../messageSender")
const { setUserStage } = require("../../../redisService")

const rotinaDeEntrega = async ({sender, msgContent, pushName}) =>{

    await sendBotMessage(sender, `Blz ${pushName} para deixar seu atendimento mais top, me diz voce gostaria de retirar aqui na loja ou receber em casa?`)
    return await setUserStage(sender, "agente_de_entrega")
}

module.exports = { rotinaDeEntrega}