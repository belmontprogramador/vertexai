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

  const mainStage = await getUserStage(sender);
  const respostas = await getUserResponses(sender, "sondagem");
  const etapa = respostas.etapa || "sondagem_ask1";

  console.log(`🎯 Estágio global: ${mainStage} | Etapa: ${etapa}`);

  if (
    mainStage !== "sondagem_de_acessorios" &&
    mainStage !== "sequencia_de_atendimento" &&
    mainStage !== "continuar_de_onde_parou"
  ) {
    return await sendBotMessage(sender, "Você não está na rotina de sondagem no momento.");
  }

  await setUserStage(sender, "sequencia_de_atendimento");

  // Criar lead na Kommo quando entra na rotina
  if (!respostas?.kommo_lead_criado) {
    try {
      await pipelineContatoInicialAcessorios({
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
    const atual = parseInt(respostas[`${chave}_index`] || 0, 10);
    return atual >= total - 1 ? 0 : atual + 1;
  };

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
      const intro2 = await agenteDeSondagemDeProduto(produtoDesejado, pushName);
      await sendBotMessage(sender, intro2);

      const perguntas2 = [
        "Qual suas prioridades de uso com o acessório que esta procurando? 🧐",
        "Me conta o que é mais importante para você ao utilizar o acessório que esta procurando? 🧐",
        "Quais benefícios você busca ao adquirir o que esta acessório? 🧐"
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
      const intro3 = await agenteDeSondagemNecessidade(necessidade, produtoDesejado2);
      await sendBotMessage(sender, intro3);

      const perguntas3 = [
        "Qual é a ideia de valor que você gostaria de investir?",
        "Tem uma faixa de valor em mente? 😊",
        "Já pensou em quanto gostaria de gastar no seu acessório? 🤔"
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

      await storeUserResponse(sender, "sondagem", "etapa", "aguardando_demonstracao");
  }
};

module.exports = { rotinaDeSondagemDeAcessorios };
