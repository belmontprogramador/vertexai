const { getLastInteraction, getUserStage, setLastInteraction, setUserStage, storeUserMessage } = require("../redisService");

/**
 * 📌 Valida mensagem recebida e define novo stage com base na lógica do fluxo
 */
const validarFluxoInicial = async (sender, msgContent) => {
  const cleanedContent = msgContent.replace(/^again\s*/i, "").trim().toLowerCase();
  const lastInteraction = await getLastInteraction(sender);
  const currentTime = Date.now();
  const CHECK_TIME_LIMIT = 1 * 60 * 1000;

  await setLastInteraction(sender, currentTime);
  await storeUserMessage(sender, cleanedContent);

  const stageAtual = await getUserStage(sender);  
  

  // 🔄 Tempo expirado
  if (!lastInteraction || currentTime - lastInteraction > CHECK_TIME_LIMIT) {
    await setUserStage(sender, "reinicio_de_atendimento");
    return "reinicio_de_atendimento";
  }

  // 🔀 Resposta direta para pular pra demonstração
  if (cleanedContent === "d") {
    await setUserStage(sender, "sequencia_de_demonstracao");
    return "sequencia_de_demonstracao";
  }

  // 🔁 Validação de decisão do usuário
  if (cleanedContent === "sim") {
    await setUserStage(sender, "sondagem");
    return "sondagem";
  }

  if (cleanedContent === "não" || cleanedContent === "nao") {
    await setUserStage(sender, "continuar_de_onde_parou");
    return "continuar_de_onde_parou";
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
