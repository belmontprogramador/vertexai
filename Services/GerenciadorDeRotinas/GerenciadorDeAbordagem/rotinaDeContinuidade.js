const { sendBotMessage } = require("../../messageSender");
const {
  getLastInteraction,
  setLastInteraction,
  storeUserMessage,
  getStageHistory // nova função que retorna previous_stage e previous_stage_2
} = require("../../redisService");

const { rotinaDeSondagem } = require("../GerenciadorDeSondagem/rotinaDeSondagemDeCelular");
const { rotinaDeDemonstracao } = require("../GerenciadorDeDemonstracao/rotinaDeDemonstracao");
const { rotinaDeAtedimentoInicial } = require("./rotinaDeAtedimentoInicial");

const rotinaDeContinuidade = async (sender, msgContent, pushName) => {
  const cleanedContent = msgContent.replace(/^again\s*/i, "").trim().toLowerCase();
  const lastInteraction = await getLastInteraction(sender);
  const currentTime = Date.now();
  const CHECK_TIME_LIMIT = 1 * 60 * 1000;

  await setLastInteraction(sender, currentTime);
  await storeUserMessage(sender, cleanedContent);

  // Recupera os dois últimos estágios do histórico
  const { stage1, stage2 } = await getStageHistory(sender);
  const previousStage = stage2 || stage1;

  console.log(`🧭 [DEBUG] Stage anterior mais antigo recuperado na continuidade: ${previousStage}`);

  const responseMessage = "Perfeito! Vamos continuar de onde paramos 😄";
  await sendBotMessage(sender, responseMessage);

  switch (true) {
    case previousStage?.includes("sondagem"):
      console.log("🚀 [DEBUG] Entrando na rotina de sondagem por continuidade");
      return await rotinaDeSondagem({ sender, msgContent, pushName });

    case previousStage?.includes("sequencia_de_demonstracao"):
      console.log("🚀 [DEBUG] Entrando na rotina de demonstração por continuidade");
      return await rotinaDeDemonstracao(sender, msgContent, pushName);

    case previousStage?.includes("abordagem") || previousStage?.includes("atendimento"):
      console.log("🚀 [DEBUG] Entrando na rotina de atendimento inicial por continuidade");
      return await rotinaDeAtedimentoInicial(sender, msgContent, pushName);

    case !previousStage:
      return await sendBotMessage(sender, "⚠️ [DEBUG] Não encontrei o estágio anterior. Me ajuda com mais contexto?");

    default:
      return await sendBotMessage(
        sender,
        `🎯 [DEBUG] Ao dar continuidade no atendimento, não consegui identificar a etapa anterior corretamente. Stage: ${previousStage}`
      );
  }
};

module.exports = { rotinaDeContinuidade };
