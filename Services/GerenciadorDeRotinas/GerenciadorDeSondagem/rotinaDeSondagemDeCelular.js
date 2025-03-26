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
    agenteDeSondagemAterrizagem,
    agenteDeSondagemDeProduto,
    agenteDeSondagemNecessidade,     
  } = require('./openAiServicesSondagem');
  const { agenteDeFechamentoSondagem } = require("./openAiServicesFechamentoDeSondagem")
  
  // 🟢 MODIFICADO AQUI — agora recebemos um único objeto com dados do contexto
  const rotinaDeSondagemDeCelular = async ({ sender, msgContent, pushName }) => {
    console.log('🚀 Entrei dentro da rotina de sondagem');
  
    const cleanedContent = msgContent.replace(/^again\s*/i, "").trim().toLowerCase();
    const currentTime = Date.now();
    await setLastInteraction(sender, currentTime);
  
    const mainStage = await getUserStage(sender);
    const respostas = await getUserResponses(sender, "sondagem");
    const etapa = respostas.etapa || "sondagem_ask1";
  
    console.log(`🎯 Estágio global: ${mainStage} | Etapa: ${etapa}`);
  
    if (
      mainStage !== "sondagem_de_celular" && 
      mainStage !== "sequencia_de_atendimento"  &&   
      mainStage !== "continuar_de_onde_parou"
    ) {
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
        const mensagemHumanizada = await agenteDeSondagemAterrizagem(pushName);
        await sendBotMessage(sender, mensagemHumanizada);
    
        const perguntas1 = [
          "Qual celular desperta mais seu interesse para que eu possa te fornecer mais informações?",
          "Sobre qual celular você tem mais interesse para eu te enviar mais informações!",
          "Tem algum celular que te interessou mais? Me fala para que eu possa te explicar melhor!"
        ];
        const index1 = getNextIndex(respostas, "pergunta_1", perguntas1.length);
        await storeUserResponse(sender, "sondagem", "pergunta_1_index", index1);
        await storeUserResponse(sender, "sondagem", "etapa", "resposta_pergunta_1");
        
        return await sendBotMessage(sender, perguntas1[index1]);
    
      case "resposta_pergunta_1":
        if (!cleanedContent) {
          return await sendBotMessage(sender, "Desculpa, você poderia repetir sua resposta? 😊");
        }
    
        await storeUserResponse(sender, "sondagem", "pergunta_1", cleanedContent);
        await storeUserResponse(sender, "sondagem", "etapa", "sondagem_ask2");
        return await rotinaDeSondagemDeCelular({ sender, msgContent: "", pushName });
    
      case "sondagem_ask2":
        const produtoDesejado = respostas.pergunta_1;
        const introducao = await agenteDeSondagemDeProduto(produtoDesejado, pushName);
        await sendBotMessage(sender, introducao);
    
        const perguntas2 = [
          `Mas para eu fazer um atendimento TOP preciso que me ajude com algumas informações. 😊\nQual suas prioridades de uso com o aparelho que esta procurando? 🧐`,
          `Mas para um atendimento TOP, preciso saber mais sobre suas expectativas. 😊\nMe conta o que é mais importante para você ao utilizar o aparelho que esta procurando?🧐`,
          `Mas para que eu faça um atendimento realmente TOP, preciso entender melhor suas necessidades. 😊\nQuais benefícios você busca ao adquirir o que esta aparelho? 🧐`
        ];
        const index2 = getNextIndex(respostas, "pergunta_2", perguntas2.length);
        await storeUserResponse(sender, "sondagem", "pergunta_2_index", index2);
        await storeUserResponse(sender, "sondagem", "etapa", "resposta_pergunta_2");
        return await sendBotMessage(sender, perguntas2[index2]);
    
      case "resposta_pergunta_2":        
        await storeUserResponse(sender, "sondagem", "pergunta_2", cleanedContent);
        await storeUserResponse(sender, "sondagem", "etapa", "sondagem_ask3");
        return await rotinaDeSondagemDeCelular({ sender, msgContent: "", pushName });
    
      case "sondagem_ask3":
        const necessidade = respostas.pergunta_2;
        const produtoDesejado2 = respostas.pergunta_1;
        const introFinalidade = await agenteDeSondagemNecessidade(necessidade, produtoDesejado2);
        await sendBotMessage(sender, introFinalidade);
    
        const perguntas3 = [
          "Mas para encontrar a melhor opção dentro do seu orçamento me conta, já tem alguma ideia do valor que você gostaria de investir em seu próximo smartphone ou ainda não?",
          "Mas para encontrarmos juntos uma opção que caiba certinho no seu orçamento, me fala: você já tem uma faixa de valor em mente ou ainda está analisando possibilidades? 😊",
          "Mas Para achar o modelo ideal dentro do valor que você quer investir, me diz uma coisa: já pensou em quanto gostaria de gastar no seu próximo smartphone ou está aberto(a) a sugestões? 🤔"
        ];
        const index3 = getNextIndex(respostas, "pergunta_3", perguntas3.length);
        await storeUserResponse(sender, "sondagem", "pergunta_3_index", index3);
        await storeUserResponse(sender, "sondagem", "etapa", "resposta_pergunta_3");
        return await sendBotMessage(sender, perguntas3[index3]);
    
      case "resposta_pergunta_3":        
        
    
        await storeUserResponse(sender, "sondagem", "pergunta_3", cleanedContent);
        await storeUserResponse(sender, "sondagem", "etapa", "agente_de_sondagem");
        return await rotinaDeSondagemDeCelular({ sender, msgContent: "", pushName });
    
      case "agente_de_sondagem":
        const respostasSondagem = await getUserResponses(sender, "sondagem");
        const historico = await getUserChatHistory(sender);
    
        const produto = respostasSondagem.pergunta_1;
        const finalidadeUso = respostasSondagem.pergunta_2;
        const investimento = respostasSondagem.pergunta_3;
    
          await  agenteDeFechamentoSondagem(
          sender,
          msgContent,
          produto,
          finalidadeUso,
          investimento,
          pushName
        );
    
         
        await storeUserResponse(sender, "sondagem", "etapa", "aguardando_demonstracao");
        // return await sendBotMessage(sender, "Posso te mostrar as opções agora? 😊");
    }
    
  };
  
  module.exports = { rotinaDeSondagemDeCelular };
  