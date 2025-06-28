const {
  getLastInteraction,  
  getUserStage,
  setLastInteraction,
  setUserStage,    
  redis
} = require("../redisService");

const { estaBloqueado, setBloqueio } = require("../utils/filaDeMensagem/bloqueioTemporario");


/**
 * 📌 Valida mensagem recebida e define novo stage com base na lógica do fluxo
 */
const validarFluxoInicial = async (sender, msgContent, pushName) => {
  const cleanedContent = msgContent.replace(/^again\s*/i, "").trim() 
  const lastInteraction = await getLastInteraction(sender);
  const currentTime = Date.now();
  const CHECK_TIME_LIMIT = 10 * 60 * 1000;

  await setLastInteraction(sender, currentTime);
   

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

  // 🛡️ Ignora mensagens se ainda estiver dentro da "espera do boleto"
  if (stageAtual === "open_ai_services_duvidas_boleto") {
    if (estaBloqueado(sender)) {
      console.log("⏳ Ignorando porque está bloqueado no fluxo de boleto.");
      return "ignorar";
    }
     
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
