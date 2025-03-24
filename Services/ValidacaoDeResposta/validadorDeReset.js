const {
    deleteUserChatHistory,
    deleteUserStage,
    deleteLastInteraction,
    deleteUserResponses,
    setUserStage
  } = require("../redisService");
  
  const setarReset = async (sender, msgContent) => {
    const cleanedContent = msgContent.replace(/^again\s*/i, "").trim().toLowerCase();
  
    if (cleanedContent === "resetardados") {
      await deleteUserChatHistory(sender);
    
      await deleteLastInteraction(sender);
      await deleteUserResponses(sender, "sondagem");
      await deleteUserResponses(sender, "demonstração");
      await deleteUserResponses(sender, "abordagem");
      await deleteUserResponses(sender, "fechamento");
      await deleteUserResponses(sender, "default");
      await setUserStage(sender, "primeiro_atendimento");
  
      console.log(`🔄 Todos os dados do usuário ${sender} foram resetados com sucesso.`);
      return true;
    }
  
    return false;
  };
  
  module.exports = { setarReset };
  