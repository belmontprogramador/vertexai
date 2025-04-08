const { 
  deleteUserChatHistory, 
  deleteUserStage, 
  deleteLastInteraction, 
  deleteUserResponses, 
  redis,
  deleteSelectedModel // ✅ importação adicionada
} = require("./redisService");

/**
 * 🔄 Limpa completamente os dados do usuário no Redis
 */
const setarReset = async (userId, msgContent) => {
  try {
    // 🧹 Apaga histórico de mensagens
    await deleteUserChatHistory(userId);

    // 🧹 Apaga estágio atual e histórico de stages
    await deleteUserStage(userId);
    await redis.del(`previous_stage:${userId}`);
    await redis.del(`previous_stage_2:${userId}`);

    // 🧹 Apaga última interação
    await deleteLastInteraction(userId);

    // 🧹 Apaga respostas de todas as rotinas possíveis
    const rotinas = ["sondagem", "fechamento", "acessorios", "default"];
    for (const rotina of rotinas) {
      await deleteUserResponses(userId, rotina);
    }

    // 🧹 Apaga modelos sugeridos ao usuário
    await deleteSelectedModel(userId);

    console.log(`✅ Reset concluído para o usuário ${userId}. Mensagem: ${msgContent}`);
  } catch (error) {
    console.error(`❌ Erro ao resetar dados do usuário ${userId}: ${error.message}`);
  }
};

module.exports = { setarReset };
