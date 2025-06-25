const { resetConversation } = require("./HistoricoDeConversas/conversationManager");
const {
  
  deleteUserStage,  
  deleteUserResponses,    
  deleteNomeUsuario,
  deleteConversation,
  deletePrimeiraInteracao,
  redis
} = require("./redisService");

const setarReset = async (userId) => {
  try {
     
    await deleteUserStage(userId);
    await redis.del(`previous_stage:${userId}`);
    await redis.del(`previous_stage_2:${userId}`);
    

    const rotinas = ["sondagem", "fechamento", "acessorios", "default"];
    for (const rotina of rotinas) {
      await deleteUserResponses(userId, rotina);
    }

    await deleteNomeUsuario(userId);  
    await deleteConversation(userId)
    await resetConversation(userId)
    
 
    await redis.del(`user_model_history:${userId}`);
    await resetConversation(userId);
     

    // ✅ Novo: apagar a data da primeira interação
    await deletePrimeiraInteracao(userId);

    console.log(`✅ Reset total concluído para o usuário ${userId}`);
  } catch (error) {
    console.error(`❌ Erro ao resetar completamente o usuário ${userId}: ${error.message}`);
  }
};


module.exports = { setarReset };
