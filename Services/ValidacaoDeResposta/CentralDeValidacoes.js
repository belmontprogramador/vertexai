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
  storeUserResponse
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

  // 🔄 Tempo expirado
  if (!lastInteraction || currentTime - lastInteraction > CHECK_TIME_LIMIT) {
    await setStageHistory(sender, stageAtual);
    await setUserStage(sender, "reinicio_de_atendimento");
    return "reinicio_de_atendimento";
  }

  // // 🔀 Resposta direta para pular pra demonstração
  // if (cleanedContent === "d") {
  //   await setStageHistory(sender, stageAtual);
  //   await setUserStage(sender, "sequencia_de_demonstracao");
  //   return "sequencia_de_demonstracao";
  // }

  // ✅ Resposta SIM → vai para sondagem
  if (cleanedContent === "sim") {
    await deleteUserResponses(sender, "sondagem");
    await setStageHistory(sender, stageAtual);
    await setUserStage(sender, "abordagem");
    return "abordagem";
  }

  // ❌ Resposta NÃO → continua com stage anterior
  if (cleanedContent === "não" || cleanedContent === "nao") {
    const stage = await getUserStage(sender);
    const previousStage = stage

    console.log(`↩️ [DEBUG] Stage anterior recuperado: ${previousStage}`);

    await setUserStage(sender, "continuar_de_onde_parou");
    return "continuar_de_onde_parou";
  }

  // 🔍 Se estiver no agente de fechamento de sondagem, atualiza a variável correta
  if (stageAtual === "agente_de_fechamento_de_sondagem") {
    const respostas = await getUserResponses(sender, "sondagem");

    if (!respostas.pergunta_1 || respostas.pergunta_1 === "NÃO INFORMADO") {
      await storeUserResponse(sender, "sondagem", "pergunta_1", cleanedContent);
    } else if (!respostas.pergunta_2 || respostas.pergunta_2 === "NÃO INFORMADO") {
      await storeUserResponse(sender, "sondagem", "pergunta_2", cleanedContent);
    } else if (!respostas.pergunta_3 || respostas.pergunta_3 === "NÃO INFORMADO") {
      await storeUserResponse(sender, "sondagem", "pergunta_3", cleanedContent);
    }

    await setUserStage(sender, "agente_de_fechamento_de_sondagem");
    return "agente_de_fechamento_de_sondagem";
  }

  // 🔁 Mantém estágio atual, se for válido
  if (stageAtual === "sequencia_de_atendimento" || stageAtual === "sequencia_de_demonstracao") {
    await setUserStage(sender, stageAtual);
    return stageAtual;
  }

  // 🔚 Default
  return stageAtual;
};

module.exports = { validarFluxoInicial };