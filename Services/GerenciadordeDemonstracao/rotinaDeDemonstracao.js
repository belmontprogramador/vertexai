const { sendBotMessage } = require('../messageSender')
const {
   setLastInteraction,
   setUserStage,
   getUserStage,
   storeUserResponse,
   getUserResponses,
   getUserChatHistory
} = require('../redisService');

const rotinaDeDemonstracao = async(sender, msgContent) =>{
   const cleanedContent = msgContent.replace(/^again\s*/i, "").trim().toLowerCase();
    const currentTime = Date.now();
    await setLastInteraction(sender, currentTime);
    
   await sendBotMessage(sender, "to  na rotina de demosmtração")

}

module.exports = { rotinaDeDemonstracao }