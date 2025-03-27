const { sendBotMessage } = require('../../messageSender')
const {
   setLastInteraction,
   setUserStage,
   getUserStage,
   storeUserResponse,
   getUserResponses,
   getUserChatHistory,
   setStageHistory
} = require('../../redisService');

const {  pipelineConhecendoALoja } = require('../../ServicesKommo/pipelineConecendoALoja');

const rotinaDeDemonstracao = async({ sender, msgContent, produto, finalidadeUso, investimento, pushName }) =>{
   const cleanedContent = msgContent.replace(/^again\s*/i, "").trim().toLowerCase();
    const currentTime = Date.now();
    await setLastInteraction(sender, currentTime);
    const stageAtual = await getUserStage(sender);
await setStageHistory(sender, stageAtual);
await setUserStage(sender, "sequencia_de_demonstracao");
await pipelineConhecendoALoja(`+${sender}`);

    
   await sendBotMessage(sender, "to  na rotina de demosmtração")

}

module.exports = { rotinaDeDemonstracao }