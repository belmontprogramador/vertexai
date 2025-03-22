const {
    getLastInteraction,
    setLastInteraction,
    setUserStage,
    getUserStage,
    storeUserResponse,
    getUserResponses,
  } = require('../../Services/redisService');
  const { sendBotMessage } = require("../messageSender");
  
  const rotinaDeSondagem = async (sender, msgContent) => {
    console.log('🚀 Entrei dentro da rotina de sondagem');
  
    const cleanedContent = msgContent.replace(/^again\s*/i, "").trim().toLowerCase();
    const currentTime = Date.now();
    await setLastInteraction(sender, currentTime);
  
    const mainStage = await getUserStage(sender);
    const respostas = await getUserResponses(sender, "sondagem");
    const etapa = respostas.etapa || "sondagem_ask1";
  
    console.log(`🎯 Estágio global: ${mainStage} | Etapa: ${etapa}`);
  
    if (mainStage !== "sondagem" && mainStage !== "sequencia_de_atendimento") {
      return await sendBotMessage(sender, "Você não está na rotina de sondagem no momento.");
    }
  
    await setUserStage(sender, "sequencia_de_atendimento");
  
    const getNextIndex = (respostas, chave, total) => {
      const atual = parseInt(respostas[`${chave}_index`] || 0, 10);
      return atual >= total - 1 ? 0 : atual + 1;
    };
  
    switch (etapa) {
      case "sondagem_ask1":
      default:
        await storeUserResponse(sender, "sondagem", "pergunta_1", cleanedContent);
        await storeUserResponse(sender, "sondagem", "etapa", "sondagem_ask2");
  
        const perguntas1 = [
          "Qual produto você está procurando?",
          "O que você tem interesse em comprar hoje?",
          "Tem algum produto específico que você deseja ver?"
        ];
        const index1 = getNextIndex(respostas, "pergunta_1", perguntas1.length);
        await storeUserResponse(sender, "sondagem", "pergunta_1_index", index1);
        return await sendBotMessage(sender, perguntas1[index1]);
  
      case "sondagem_ask2":
        await storeUserResponse(sender, "sondagem", "pergunta_2", cleanedContent);
        await storeUserResponse(sender, "sondagem", "etapa", "sondagem_ask3");
  
        const perguntas2 = [
          "Você prefere pagar à vista ou parcelado?",
          "Seu pagamento será à vista ou parcelado?",
          "Como você pretende pagar, à vista ou em parcelas?"
        ];
        const index2 = getNextIndex(respostas, "pergunta_2", perguntas2.length);
        await storeUserResponse(sender, "sondagem", "pergunta_2_index", index2);
        return await sendBotMessage(sender, perguntas2[index2]);
  
      case "sondagem_ask3":
        await storeUserResponse(sender, "sondagem", "pergunta_3", cleanedContent);
        await storeUserResponse(sender, "sondagem", "etapa", "sondagem_ask1");
  
        const encerramento = [
          "Obrigado! Em breve vamos te enviar as melhores ofertas.",
          "Ótimo! Nossa equipe vai te mandar as melhores opções!",
          "Perfeito! Já vamos te responder com as ofertas ideais pra você."
        ];
        const index3 = getNextIndex(respostas, "pergunta_3", encerramento.length);
        await storeUserResponse(sender, "sondagem", "pergunta_3_index", index3);
        return await sendBotMessage(sender, encerramento[index3]);
    }
  };
  
  module.exports = { rotinaDeSondagem };
  