const rotinaDeSondagemComplementar = async (sender, msgContent) => {
    const respostas = await getUserResponses(sender, "sondagem");
  
    // Suponha que já armazenamos etapa_complementar
    const etapa = respostas.etapa_complementar || "pergunta_marca";
  
    switch (etapa) {
      case "pergunta_marca":
        await storeUserResponse(sender, "sondagem", "marca_preferida", msgContent);
        await storeUserResponse(sender, "sondagem", "etapa_complementar", "pergunta_uso");
  
        return await sendBotMessage(sender, "Você pretende usar mais em casa, no trabalho ou em movimento?");
  
      case "pergunta_uso":
        await storeUserResponse(sender, "sondagem", "contexto_uso", msgContent);
  
        // Pronto para nova recomendação
        await storeUserResponse(sender, "sondagem", "etapa", "agente_de_sondagem");
        await setUserStage(sender, "sondagem");
  
        return await sendBotMessage(sender, "Perfeito! Com essas novas informações, posso refinar ainda mais as opções pra você 😉");
  
      default:
        await storeUserResponse(sender, "sondagem", "etapa_complementar", "pergunta_marca");
        return await sendBotMessage(sender, "Você tem alguma marca preferida?");
    }
  };
  
  module.exports = { rotinaDeSondagemComplementar };
  