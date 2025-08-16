const {
    
    deleteLastInteractionApiOficial,
    deleteUserStageApiOficial
  } = require("../Services/redisService");
  
  
  
  const setarResetApiOficial = async (userId) => {
    try {
      // 🔁 Apaga o stage e a última interação
      await deleteUserStageApiOficial(userId);
      await deleteLastInteractionApiOficial(userId);
  
       
  
      console.log(`✅ Reset da API Oficial concluído para o usuário ${userId}`);
    } catch (error) {
      console.error(`❌ Erro ao resetar dados da API Oficial para ${userId}: ${error.message}`);
    }
  };
  
  module.exports = { setarResetApiOficial };
  