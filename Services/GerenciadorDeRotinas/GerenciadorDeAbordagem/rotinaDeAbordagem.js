const { sendBotMessage } = require("../../messageSender");
const {
    getLastInteraction,
    deleteUserResponses,
    getUserStage,
    setLastInteraction,
    setUserStage,
    storeUserMessage,
    setStageHistory, // ✅ correto
    getStageHistory
  } = require("../../redisService");

const rotinaDeAbordagem = async ({sender, msgContent, pushName}) => {
    
    const responseMessage =`Oi ${pushName} Anna do time VERTEX aqui 🙋🏻‍♀. Vou te ajudar no seu atendimento✨\nTenho várias oportunidades incríveis aqui na loja! 🤩`
    const responseMessage2 = `Me conte, sobre quais desses produtos você gostaria de saber mais? Vou te passar todos os detalhes! 👇\n💳📱 1 - Celulares\n🎧 2 - Acessórios\n💳 3 - Pagamento via Boleto\n🛍️ 4 - Outros (me diga o que procura!)`
    await sendBotMessage(sender, responseMessage)
    await sendBotMessage(sender,responseMessage2)
    await setUserStage(sender, "sequencia_de_abordagem")
    const stage = await getUserStage(sender)
    console.log(`setei o stage ${stage}`)
     

  return;
};

module.exports = { rotinaDeAbordagem };