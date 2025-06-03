const {
  getLastInteraction,
  deleteUserResponses,
  getUserStage,
  setLastInteraction,
  setUserStage,
  storeUserMessage,
  setStageHistory,  
  redis
} = require("../redisService");

const {testeDeEnvio} = require("./testeDeEnvio")

/**
 * 📌 Valida mensagem recebida e define novo stage com base na lógica do fluxo
 */
const validarFluxoInicial = async (sender, msgContent, pushName) => {
  const cleanedContent = msgContent.replace(/^again\s*/i, "").trim() 
  const lastInteraction = await getLastInteraction(sender);
  const currentTime = Date.now();
  const CHECK_TIME_LIMIT = 10 * 60 * 1000;

  await setLastInteraction(sender, currentTime);
  await storeUserMessage(sender, cleanedContent);

  const stageAtual = await getUserStage(sender);

  // 👶 Se o usuário nunca teve interação, começa com primeiro atendimento
  if (
    !stageAtual &&
    (
      cleanedContent.includes("Opa! quero um smartphone que combine com meu estilo 📲. podem me ajudar? 😊") ||
      cleanedContent.includes("Olá, quero ver as ofertas de smartphones da semana. Me mostram? 😃")
    )
  ) {
    await setUserStage(sender, "rotina_captura_de_nome_para_trafego");
    return "rotina_captura_de_nome_para_trafego";
  } else if (!stageAtual && cleanedContent === "Olá! 😊 poderia me explicar como é o parcelamento via boleto? 💸") {
    await setUserStage(sender, "rotina_captura_de_nome_para_boleto");
    return "rotina_captura_de_nome_para_boleto";
  
  } else if (!stageAtual) {
    console.log(`👋 [DEBUG] Nenhum histórico encontrado. Setando como 'rotina_captura_de_nome'`);
    await setUserStage(sender, "rotina_captura_de_nome");
    return "rotina_captura_de_nome";
  }
  
  
  // 🔄 Tempo expirado
  if (!lastInteraction || currentTime - lastInteraction > CHECK_TIME_LIMIT) {
    await setStageHistory(sender, stageAtual);
    await setUserStage(sender, "reinicio_de_atendimento");
    return "reinicio_de_atendimento";
  }

  // ✅ Resposta SIM → vai para sondagem
  if (cleanedContent === "sim") {
    await deleteUserResponses(sender);
    await setStageHistory(sender, stageAtual);
    await setUserStage(sender, "primeiro_atendimento");
    return "primeiro_atendimento";
  }

  // if (cleanedContent === "boleto"){
  //   await setUserStage(sender, "hall_de_boleto");
  //   return await rotinaDeBoleto({ sender, msgContent, pushName });
  // }

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

  // 🔁 Mantém estágio atual, se for válido
  if (stageAtual === "sequencia_de_atendimento" || stageAtual === "sequencia_de_demonstracao") {
    await setUserStage(sender, stageAtual);
    return stageAtual;
  }

  // 🔚 Default
  return stageAtual;
};

module.exports = { validarFluxoInicial };
