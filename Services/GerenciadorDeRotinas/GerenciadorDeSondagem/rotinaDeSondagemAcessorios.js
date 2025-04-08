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
  agenteDeSondagemNecessidade
} = require('./ServicesOpenAiSondagem/openAiServicesSondagem');
const { agenteDeFechamentoSondagemDeAcessorio } = require("./ServicesOpenAiSondagem/openAiServicesFechamentoDeSondagemAcessorios");
const { pipelineContatoInicialAcessorios } = require("../../ServicesKommo/pipelineContatoInicialAcessorios");

const rotinaDeSondagemDeAcessorios = async ({ sender, msgContent, pushName }) => {
  console.log('🚀 Entrei dentro da rotina de sondagemdeacessorio');

  const cleanedContent = msgContent.replace(/^again\s*/i, "").trim().toLowerCase();
  const currentTime = Date.now();
  await setLastInteraction(sender, currentTime);
  await setUserStage(sender, "sondagem_de_acessorios");

  const mainStage = await getUserStage(sender);
  const respostas = await getUserResponses(sender, "sondagem_de_acessorios");
  const etapa = respostas.etapa || "sondagem_ask1";

  console.log(`🎯 Estágio global: ${mainStage} | Etapa: ${etapa}`);

  if (mainStage !== "sondagem_de_acessorios") {
    return await sendBotMessage(sender, "Você não está na rotina de sondagem no momento.");
  }

  if (!respostas?.kommo_lead_criado) {
    try {
      console.log("🚀 Chamando pipelineContatoInicialAcessorios para o número:", `+${sender}`);
      
      await pipelineContatoInicialAcessorios({
        name: `Lead do WhatsApp - ${pushName}`,
        phone: `+${sender}`,
        firstName: pushName
      });
  
      await storeUserResponse(sender, "sondagem_de_acessorios", "kommo_lead_criado", true);
      console.log("✅ Lead criado ou movido para o pipeline de Acessórios com sucesso.");
  
    } catch (error) {
      console.error("❌ Erro ao criar ou mover lead na Kommo:", error.message);
    }
  } 
  

  const getNextIndex = (respostas, chave, total) => {
    const atual = parseInt(respostas[`${chave}_index`] || -1, 10);
    let novoIndex;
    do {
      novoIndex = Math.floor(Math.random() * total);
    } while (novoIndex === atual && total > 1);
    return novoIndex;
  };

  if (!cleanedContent && etapa === "resposta_pergunta_2") {
    const perguntas2 = [
      "Qual suas prioridades de uso com o acessório que esta procurando? 🧐",
      "Me conta o que é mais importante para você ao utilizar o acessório que esta procurando? 🧐",
      "Quais benefícios você busca ao adquirir o que esta acessório? 🧐"
    ];
    const index2 = respostas.pergunta_2_index || 0;
    const intro2 = await agenteDeSondagemDeProduto(respostas.pergunta_1, pushName);
    return await sendBotMessage(sender, `${intro2}\n\n${perguntas2[index2]}`);
  }

  if (!cleanedContent && etapa === "resposta_pergunta_3") {
    const perguntas3 = [
      "Qual é a ideia de valor que você gostaria de investir?",
      "Tem uma faixa de valor em mente? 😊",
      "Já pensou em quanto gostaria de gastar no seu acessório? 🤔"
    ];
    const index3 = respostas.pergunta_3_index || 0;
    const intro3 = await agenteDeSondagemNecessidade(respostas.pergunta_2, respostas.pergunta_1);
    return await sendBotMessage(sender, `${intro3}\n\n${perguntas3[index3]}`);
  }

  switch (etapa) {
    case "sondagem_ask1":
    default:
      const msgIntro = await agenteDeSondagemAterrizagem(pushName);
      await sendBotMessage(sender, msgIntro);

      const perguntas1 = [
        "Qual acessório desperta mais seu interesse para que eu possa te fornecer mais informações?",
        "Sobre qual acessório você tem mais interesse para eu te enviar mais informações!",
        "Tem algum acessório que te interessou mais? Me fala para que eu possa te explicar melhor!"
      ];
      const index1 = getNextIndex(respostas, "pergunta_1", perguntas1.length);
      await storeUserResponse(sender, "sondagem_de_acessorios", "pergunta_1_index", index1);
      await storeUserResponse(sender, "sondagem_de_acessorios", "etapa", "resposta_pergunta_1");
      return await sendBotMessage(sender, perguntas1[index1]);

    case "resposta_pergunta_1":
      if (!cleanedContent || cleanedContent === "não") {
        const perguntas1 = [
          "Qual acessório desperta mais seu interesse para que eu possa te fornecer mais informações?",
          "Sobre qual acessório você tem mais interesse para eu te enviar mais informações!",
          "Tem algum acessório que te interessou mais? Me fala para que eu possa te explicar melhor!"
        ];
        const index1 = respostas.pergunta_1_index || 0;
        const msgIntro = await agenteDeSondagemAterrizagem(pushName);
        return await sendBotMessage(sender, `${msgIntro}\n\n${perguntas1[index1]}`);
      }

      await storeUserResponse(sender, "sondagem_de_acessorios", "pergunta_1", cleanedContent);
      await storeUserResponse(sender, "sondagem_de_acessorios", "etapa", "sondagem_ask2");
      return await rotinaDeSondagemDeAcessorios({ sender, msgContent: "", pushName });

    case "sondagem_ask2":
      const produtoDesejado = respostas.pergunta_1;
      const intro2 = await agenteDeSondagemDeProduto(produtoDesejado, pushName);
      await sendBotMessage(sender, intro2);

      const perguntas2 = [
        "Qual suas prioridades de uso com o acessório que esta procurando? 🧐",
        "Me conta o que é mais importante para você ao utilizar o acessório que esta procurando? 🧐",
        "Quais benefícios você busca ao adquirir o que esta acessório? 🧐"
      ];
      const index2 = getNextIndex(respostas, "pergunta_2", perguntas2.length);
      await storeUserResponse(sender, "sondagem_de_acessorios", "pergunta_2_index", index2);
      await storeUserResponse(sender, "sondagem_de_acessorios", "etapa", "resposta_pergunta_2");
      return await sendBotMessage(sender, perguntas2[index2]);

    case "resposta_pergunta_2":
      if (!cleanedContent || cleanedContent === "não") {
        const perguntas2 = [
          "Qual suas prioridades de uso com o acessório que esta procurando? 🧐",
          "Me conta o que é mais importante para você ao utilizar o acessório que esta procurando? 🧐",
          "Quais benefícios você busca ao adquirir o que esta acessório? 🧐"
        ];
        const index2 = respostas.pergunta_2_index || 0;
        const intro2 = await agenteDeSondagemDeProduto(respostas.pergunta_1, pushName);
        return await sendBotMessage(sender, `${intro2}\n\n${perguntas2[index2]}`);
      }

      await storeUserResponse(sender, "sondagem_de_acessorios", "pergunta_2", cleanedContent);
      await storeUserResponse(sender, "sondagem_de_acessorios", "etapa", "sondagem_ask3");
      return await rotinaDeSondagemDeAcessorios({ sender, msgContent: "", pushName });

    case "sondagem_ask3":
      const necessidade = respostas.pergunta_2;
      const produtoDesejado2 = respostas.pergunta_1;
      const intro3 = await agenteDeSondagemNecessidade(necessidade, produtoDesejado2);
      await sendBotMessage(sender, intro3);

      const perguntas3 = [
        "Qual é a ideia de valor que você gostaria de investir?",
        "Tem uma faixa de valor em mente? 😊",
        "Já pensou em quanto gostaria de gastar no seu acessório? 🤔"
      ];
      const index3 = getNextIndex(respostas, "pergunta_3", perguntas3.length);
      await storeUserResponse(sender, "sondagem_de_acessorios", "pergunta_3_index", index3);
      await storeUserResponse(sender, "sondagem_de_acessorios", "etapa", "resposta_pergunta_3");
      return await sendBotMessage(sender, perguntas3[index3]);

    case "resposta_pergunta_3":
      if (!cleanedContent || cleanedContent === "não") {
        const perguntas3 = [
          "Qual é a ideia de valor que você gostaria de investir?",
          "Tem uma faixa de valor em mente? 😊",
          "Já pensou em quanto gostaria de gastar no seu acessório? 🤔"
        ];
        const index3 = respostas.pergunta_3_index || 0;
        const intro3 = await agenteDeSondagemNecessidade(respostas.pergunta_2, respostas.pergunta_1);
        return await sendBotMessage(sender, `${intro3}\n\n${perguntas3[index3]}`);
      }

      await storeUserResponse(sender, "sondagem_de_acessorios", "pergunta_3", cleanedContent);
      await storeUserResponse(sender, "sondagem_de_acessorios", "etapa", "agente_de_sondagem");
      return await rotinaDeSondagemDeAcessorios({ sender, msgContent: "", pushName });

    case "agente_de_sondagem":
      const respostasSondagem = await getUserResponses(sender, "sondagem_de_acessorios");
      const produto = respostasSondagem.pergunta_1;
      const finalidadeUso = respostasSondagem.pergunta_2;
      const investimento = respostasSondagem.pergunta_3;

      await agenteDeFechamentoSondagemDeAcessorio(
        sender,
        msgContent,
        produto,
        finalidadeUso,
        investimento,
        pushName
      );

      await storeUserResponse(sender, "sondagem_de_acessorios", "etapa", "aguardando_demonstracao");
  }
};

module.exports = { rotinaDeSondagemDeAcessorios };
