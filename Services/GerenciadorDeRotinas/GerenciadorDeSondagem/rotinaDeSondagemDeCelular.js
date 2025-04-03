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
const { agenteDeFechamentoSondagem } = require("./ServicesOpenAiSondagem/openAiServicesFechamentoDeSondagem");
const { pipelineContatoInicial } = require("../../ServicesKommo/pipelineContatoInicial");

const rotinaDeSondagemDeCelular = async ({ sender, msgContent, pushName }) => {
  console.log('🚀 Entrei dentro da rotina de sondagem');

  const cleanedContent = msgContent.replace(/^again\s*/i, "").trim().toLowerCase();
  const currentTime = Date.now();
  await setLastInteraction(sender, currentTime);

  await setUserStage(sender, "sondagem_de_celular");

  const mainStage = await getUserStage(sender);
  const respostas = await getUserResponses(sender, "sondagem");
  const etapa = respostas.etapa || "sondagem_ask1";

  console.log(`🎯 Estágio global: ${mainStage} | Etapa: ${etapa}`);

  if (!"sondagem_de_celular") {
    return await sendBotMessage(sender, "Você não está na rotina de sondagem no momento.");
  }

  await setUserStage(sender, "sondagem_de_celular");

  if (!respostas?.kommo_lead_criado) {
    try {
      await pipelineContatoInicial({
        name: `Lead do WhatsApp - ${pushName}`,
        phone: `+${sender}`,
        firstName: pushName
      });
      await storeUserResponse(sender, "sondagem", "kommo_lead_criado", true);
    } catch (error) {
      console.error("❌ Erro ao criar lead na Kommo:", error.message);
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

  // Verificação de retomada automática com base na etapa anterior
  if (!cleanedContent && etapa === "resposta_pergunta_2") {
    const perguntas2 = [
      "Qual suas prioridades de uso com o aparelho que está procurando? 🧐",
      "Me conta o que é mais importante para você ao utilizar o aparelho que está procurando? 🧐",
      "Quais benefícios você busca ao adquirir esse aparelho? 🧐"
    ];
    const index2 = respostas.pergunta_2_index || 0;
    const intro2 = await agenteDeSondagemDeProduto(respostas.pergunta_1, pushName);
    return await sendBotMessage(sender, `${intro2}\n\n${perguntas2[index2]}`);
  }

  if (!cleanedContent && etapa === "resposta_pergunta_3") {
    const perguntas3 = [
      "Qual é a ideia de valor que você gostaria de investir?",
      "Tem uma faixa de valor em mente? 😊",
      "Já pensou em quanto gostaria de gastar no seu próximo smartphone? 🤔"
    ];
    const index3 = respostas.pergunta_3_index || 0;
    const intro3 = await agenteDeSondagemNecessidade(respostas.pergunta_2, respostas.pergunta_1);
    return await sendBotMessage(sender, `${intro3}\n\n${perguntas3[index3]}`);
  }

  switch (etapa) {
    case "sondagem_ask1":
    default: {
      const msgIntro = await agenteDeSondagemAterrizagem(pushName);
      await sendBotMessage(sender, msgIntro);

      const perguntas1 = [
        "Qual celular desperta mais seu interesse para que eu possa te fornecer mais informações?",
        "Sobre qual celular você tem mais interesse para eu te enviar mais informações!",
        "Tem algum celular que te interessou mais? Me fala para que eu possa te explicar melhor!"
      ];

      const index1 = getNextIndex(respostas, "pergunta_1", perguntas1.length);
      await storeUserResponse(sender, "sondagem", "pergunta_1_index", index1);
      await storeUserResponse(sender, "sondagem", "etapa", "resposta_pergunta_1");
      return await sendBotMessage(sender, perguntas1[index1]);
    }

    case "resposta_pergunta_1": {
      if (!cleanedContent || cleanedContent === "não") {
        const perguntas1 = [
          "Qual celular desperta mais seu interesse para que eu possa te fornecer mais informações?",
          "Sobre qual celular você tem mais interesse para eu te enviar mais informações!",
          "Tem algum celular que te interessou mais? Me fala para que eu possa te explicar melhor!"
        ];
        const index1 = respostas.pergunta_1_index || 0;
        const msgIntro = await agenteDeSondagemAterrizagem(pushName);
        return await sendBotMessage(sender, `${msgIntro}\n\n${perguntas1[index1]}`);
      }

      await storeUserResponse(sender, "sondagem", "pergunta_1", cleanedContent);
      await storeUserResponse(sender, "sondagem", "etapa", "sondagem_ask2");
      return await rotinaDeSondagemDeCelular({ sender, msgContent: "", pushName });
    }

    case "sondagem_ask2": {
      const produtoDesejado = respostas.pergunta_1;
      const intro2 = await agenteDeSondagemDeProduto(produtoDesejado, pushName);
      await sendBotMessage(sender, intro2);

      const perguntas2 = [
        "Qual suas prioridades de uso com o aparelho que está procurando? 🧐",
        "Me conta o que é mais importante para você ao utilizar o aparelho que está procurando? 🧐",
        "Quais benefícios você busca ao adquirir esse aparelho? 🧐"
      ];

      const index2 = getNextIndex(respostas, "pergunta_2", perguntas2.length);
      await storeUserResponse(sender, "sondagem", "pergunta_2_index", index2);
      await storeUserResponse(sender, "sondagem", "etapa", "resposta_pergunta_2");
      return await sendBotMessage(sender, perguntas2[index2]);
    }

    case "resposta_pergunta_2": {
      if (!cleanedContent || cleanedContent === "não") {
        const perguntas2 = [
          "Qual suas prioridades de uso com o aparelho que está procurando? 🧐",
          "Me conta o que é mais importante para você ao utilizar o aparelho que está procurando? 🧐",
          "Quais benefícios você busca ao adquirir esse aparelho? 🧐"
        ];
        const index2 = respostas.pergunta_2_index || 0;
        const intro2 = await agenteDeSondagemDeProduto(respostas.pergunta_1, pushName);
        return await sendBotMessage(sender, `${intro2}\n\n${perguntas2[index2]}`);
      }

      await storeUserResponse(sender, "sondagem", "pergunta_2", cleanedContent);
      await storeUserResponse(sender, "sondagem", "etapa", "sondagem_ask3");
      return await rotinaDeSondagemDeCelular({ sender, msgContent: "", pushName });
    }

    case "sondagem_ask3": {
      const necessidade = respostas.pergunta_2;
      const produtoDesejado2 = respostas.pergunta_1;
      const intro3 = await agenteDeSondagemNecessidade(necessidade, produtoDesejado2);
      await sendBotMessage(sender, intro3);

      const perguntas3 = [
        "Qual é a ideia de valor que você gostaria de investir?",
        "Tem uma faixa de valor em mente? 😊",
        "Já pensou em quanto gostaria de gastar no seu próximo smartphone? 🤔"
      ];

      const index3 = getNextIndex(respostas, "pergunta_3", perguntas3.length);
      await storeUserResponse(sender, "sondagem", "pergunta_3_index", index3);
      await storeUserResponse(sender, "sondagem", "etapa", "resposta_pergunta_3");
      return await sendBotMessage(sender, perguntas3[index3]);
    }

    case "resposta_pergunta_3": {
      if (!cleanedContent || cleanedContent === "não") {
        const perguntas3 = [
          "Qual é a ideia de valor que você gostaria de investir?",
          "Tem uma faixa de valor em mente? 😊",
          "Já pensou em quanto gostaria de gastar no seu próximo smartphone? 🤔"
        ];
        const index3 = respostas.pergunta_3_index || 0;
        const intro3 = await agenteDeSondagemNecessidade(respostas.pergunta_2, respostas.pergunta_1);
        return await sendBotMessage(sender, `${intro3}\n\n${perguntas3[index3]}`);
      }

      await storeUserResponse(sender, "sondagem", "pergunta_3", cleanedContent);
      await storeUserResponse(sender, "sondagem", "etapa", "agente_de_sondagem");
      return await rotinaDeSondagemDeCelular({ sender, msgContent: "", pushName });
    }

    case "agente_de_sondagem": {
      const respostasSondagem = await getUserResponses(sender, "sondagem");
      const produto = respostasSondagem.pergunta_1;
      const finalidadeUso = respostasSondagem.pergunta_2;
      const investimento = respostasSondagem.pergunta_3;

      await agenteDeFechamentoSondagem(sender, msgContent, produto, finalidadeUso, investimento, pushName);
      await storeUserResponse(sender, "sondagem", "etapa", "aguardando_demonstracao");
    }
  }
};

module.exports = { rotinaDeSondagemDeCelular };