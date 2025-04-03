const {
  getLastInteraction,
  deleteUserResponses,
  getUserStage,
  setLastInteraction,
  setUserStage,
  storeUserMessage,
  setStageHistory,
  getStageHistory,
  getUserResponses,
  storeUserResponse,
  redis
} = require("../redisService");

/**
 * 📌 Valida mensagem recebida e define novo stage com base na lógica do fluxo
 */
const validarFluxoInicial = async (sender, msgContent, pushName) => {
  const cleanedContent = msgContent.replace(/^again\s*/i, "").trim().toLowerCase();
  const lastInteraction = await getLastInteraction(sender);
  const currentTime = Date.now();
  const CHECK_TIME_LIMIT = 1 * 60 * 1000;

  await setLastInteraction(sender, currentTime);
  await storeUserMessage(sender, cleanedContent);

  const stageAtual = await getUserStage(sender);

  // 👶 Se o usuário nunca teve interação, começa com primeiro atendimento
  if (!stageAtual) {
    console.log(`👋 [DEBUG] Nenhum histórico encontrado. Setando como 'primeiro_atendimento'`);
    await setUserStage(sender, "primeiro_atendimento");
    return "primeiro_atendimento";
  }

  // 🔄 Tempo expirado
  if (!lastInteraction || currentTime - lastInteraction > CHECK_TIME_LIMIT) {
    await setStageHistory(sender, stageAtual);
    await setUserStage(sender, "reinicio_de_atendimento");
    return "reinicio_de_atendimento";
  }

  // ✅ Resposta SIM → vai para sondagem
  if (cleanedContent === "sim") {
    await deleteUserResponses(sender, "sondagem");
    await setStageHistory(sender, stageAtual);
    await setUserStage(sender, "abordagem");
    return "abordagem";
  }

  const precisaRepetirPergunta = (respostas, perguntaChave) => {
    return !respostas[perguntaChave] || respostas[perguntaChave] === "" || respostas[perguntaChave] === "NÃO INFORMADO";
  };
  

  
 // ❌ Resposta NÃO → volta um estágio anterior ao atual
if (cleanedContent === "não" || cleanedContent === "nao") {
  const previousStage = await redis.get(`previous_stage:${sender}`);

  console.log(`↩️ [DEBUG] Stage anterior recuperado: ${previousStage}`);

  await setUserStage(sender, previousStage);
  return previousStage;
}


  // // 🔍 Se estiver no agente de fechamento ou rotina de fechamento
  // if (stageAtual === "agente_de_fechamento_de_sondagem" || stageAtual === "fechamento") {
  //   const respostas = await getUserResponses(sender, "fechamento");

  //   if (!respostas.pergunta_1 || respostas.pergunta_1 === "NÃO INFORMADO") {
  //     await storeUserResponse(sender, "fechamento", "pergunta_1", cleanedContent);
  //   } else if (!respostas.pergunta_2 || respostas.pergunta_2 === "NÃO INFORMADO") {
  //     await storeUserResponse(sender, "fechamento", "pergunta_2", cleanedContent);
  //   } else if (!respostas.pergunta_3 || respostas.pergunta_3 === "NÃO INFORMADO") {
  //     await storeUserResponse(sender, "fechamento", "pergunta_3", cleanedContent);
  //   }

  //   await setUserStage(sender, "fechamento");
  //   return "fechamento";
  // }

  // 🔁 Mantém estágio atual, se for válido
  if (stageAtual === "sequencia_de_atendimento" || stageAtual === "sequencia_de_demonstracao") {
    await setUserStage(sender, stageAtual);
    return stageAtual;
  }

  // 🔚 Default
  return stageAtual;
};

module.exports = { validarFluxoInicial };
