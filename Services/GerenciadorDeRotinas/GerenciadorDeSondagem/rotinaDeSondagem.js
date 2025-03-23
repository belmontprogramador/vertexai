const {
    setLastInteraction,
    setUserStage,
    getUserStage,
    storeUserResponse,
    getUserResponses,
    getUserChatHistory
  } = require('../../redisService');
  
  const { sendBotMessage } = require("../../messageSender");
  const {
    agenteDeDesondagem,
    agenteDeSondagemAterrizagem,
    agenteDeSondagemDeProduto,
    agenteDeNecessidade
  } = require('./openAiServicesSondagem');
  
  // 🟢 MODIFICADO AQUI — agora recebemos um único objeto com dados do contexto
  const rotinaDeSondagem = async ({ sender, msgContent, pushName }) => {
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
        const mensagemHumanizada = await agenteDeSondagemAterrizagem();
        await sendBotMessage(sender, mensagemHumanizada);
  
        const perguntas1 = [
          "Qual produto você está procurando?",
          "O que você tem interesse em comprar hoje?",
          "Tem algum produto específico que você deseja ver?"
        ];
        const index1 = getNextIndex(respostas, "pergunta_1", perguntas1.length);
        await storeUserResponse(sender, "sondagem", "pergunta_1_index", index1);
        await storeUserResponse(sender, "sondagem", "etapa", "resposta_pergunta_1");
        return await sendBotMessage(sender, perguntas1[index1]);
  
      case "resposta_pergunta_1":
        await storeUserResponse(sender, "sondagem", "pergunta_1", cleanedContent);
        await storeUserResponse(sender, "sondagem", "etapa", "sondagem_ask2");
        return await rotinaDeSondagem({ sender, msgContent: "", pushName }); // 🟢 MODIFICADO AQUI
  
      case "sondagem_ask2":
        const produtoDesejado = respostas.pergunta_1;
        const introducao = await agenteDeSondagemDeProduto(produtoDesejado, pushName); // 🟢 MODIFICADO AQUI
        await sendBotMessage(sender, introducao);
  
        const perguntas2 = [
          "Para qual finalidade você pretende usar esse produto?",
          "Qual é a principal necessidade que esse produto vai te ajudar a resolver?",
          "Em que situação você mais precisa desse produto no seu dia a dia?"
        ];
        const index2 = getNextIndex(respostas, "pergunta_2", perguntas2.length);
        await storeUserResponse(sender, "sondagem", "pergunta_2_index", index2);
        await storeUserResponse(sender, "sondagem", "etapa", "resposta_pergunta_2");
        return await sendBotMessage(sender, perguntas2[index2]);
  
      case "resposta_pergunta_2":
        await storeUserResponse(sender, "sondagem", "pergunta_2", cleanedContent);
        await storeUserResponse(sender, "sondagem", "etapa", "sondagem_ask3");
        return await rotinaDeSondagem({ sender, msgContent: "", pushName }); // 🟢 MODIFICADO AQUI
  
      case "sondagem_ask3":
        const necessidade = respostas.pergunta_2;
        const produtoDesejado2 = respostas.pergunta_1;
        const introFinalidade = await agenteDeNecessidade(necessidade, produtoDesejado2);
        await sendBotMessage(sender, introFinalidade);
  
        const perguntas3 = [
          "Qual valor você está disposto a investir nesse produto?",
          "Até quanto você pretende gastar nessa compra?",
          "Tem um orçamento definido para esse produto?"
        ];
        const index3 = getNextIndex(respostas, "pergunta_3", perguntas3.length);
        await storeUserResponse(sender, "sondagem", "pergunta_3_index", index3);
        await storeUserResponse(sender, "sondagem", "etapa", "resposta_pergunta_3");
        return await sendBotMessage(sender, perguntas3[index3]);
  
      case "resposta_pergunta_3":
        await storeUserResponse(sender, "sondagem", "pergunta_3", cleanedContent);
        await storeUserResponse(sender, "sondagem", "etapa", "agente_de_sondagem");
        return await rotinaDeSondagem({ sender, msgContent: "", pushName }); // 🟢 MODIFICADO AQUI
  
      case "agente_de_sondagem":
        const respostasSondagem = await getUserResponses(sender, "sondagem");
        const historico = await getUserChatHistory(sender);
  
        const produto = respostasSondagem.pergunta_1;
        const finalidadeUso = respostasSondagem.pergunta_2;
        const investimento = respostasSondagem.pergunta_3;
  
        const recomendacao = await agenteDeDesondagem(
          produto,
          finalidadeUso,
          investimento,
          historico.join("\n")
        );
  
        await sendBotMessage(sender, recomendacao);
        await storeUserResponse(sender, "sondagem", "etapa", "aguardando_demonstracao");
        return await sendBotMessage(sender, "Posso te mostrar as opções agora? 😊");
    }
  };
  
  module.exports = { rotinaDeSondagem };
  