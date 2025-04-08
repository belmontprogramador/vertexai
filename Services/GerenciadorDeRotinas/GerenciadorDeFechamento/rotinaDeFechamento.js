const {
  setLastInteraction,
  setUserStage,
  getUserStage,
  storeUserResponse,
  getUserResponses
} = require('../../redisService');

const { sendBotMessage } = require("../../messageSender");
const { agenteDeFechamento } = require("../../GerenciadorDeRotinas/GerenciadorDeFechamento/ServicesOpeanAiFechamento/openAiServicesFechamento");

const rotinaDeFechamento = async ({ sender, msgContent, produto, finalidadeUso, investimento, pushName }) => {
  console.log('🚀 Entrei na rotina de fechamento');

  const cleanedContent = msgContent.replace(/^again\s*/i, "").trim().toLowerCase();
  const currentTime = Date.now();
  await setLastInteraction(sender, currentTime);
  await setUserStage(sender, "fechamento");

  const mainStage = await getUserStage(sender);
  const respostas = await getUserResponses(sender, "fechamento");
  const etapa = respostas.etapa || "fechamento_ask1";

  console.log(`🎯 Estágio global: ${mainStage} | Etapa: ${etapa}`);

  if (
    mainStage !== "fechamento" &&
    mainStage !== "sequencia_de_atendimento" &&
    mainStage !== "continuar_de_onde_parou"
  ) {
    return await sendBotMessage(sender, "Você não está na rotina de fechamento no momento.");
  }

  const getNextIndex = (respostas, chave, total) => {
    const atual = parseInt(respostas[`${chave}_index`] || -1, 10);
    return (atual + 1) % total;
  };

  switch (etapa) {
    case "fechamento_ask1":
    default: {
      await sendBotMessage(sender, `Perfeito, ${pushName}! Só pra alinhar os detalhes finais 😊`);

      const perguntas1 = [
        "Quando você está planejando realizar a compra? 📅",
        "Tem uma data em mente para fechar a compra?",
        "Pra quando está pensando em comprar esse acessório?"
      ];

      const index1 = getNextIndex(respostas, "fechamento_1", perguntas1.length);
      await storeUserResponse(sender, "fechamento", "fechamento_1_index", index1);
      await storeUserResponse(sender, "fechamento", "etapa", "resposta_fechamento_1");
      return await sendBotMessage(sender, perguntas1[index1]);
    }

    case "resposta_fechamento_1": {
      await storeUserResponse(sender, "fechamento", "data_compra", cleanedContent);
      await storeUserResponse(sender, "fechamento", "etapa", "fechamento_ask2");
      return await rotinaDeFechamento({ sender, msgContent: "", pushName });
    }

    case "fechamento_ask2": {
      const perguntas2 = [
        "Qual forma de pagamento você pretende usar? 💳",
        "Vai pagar em dinheiro, cartão ou outro método?",
        "Como pretende pagar pela compra?"
      ];

      const index2 = getNextIndex(respostas, "fechamento_2", perguntas2.length);
      await storeUserResponse(sender, "fechamento", "fechamento_2_index", index2);
      await storeUserResponse(sender, "fechamento", "etapa", "resposta_fechamento_2");
      return await sendBotMessage(sender, perguntas2[index2]);
    }

    case "resposta_fechamento_2": {
      await storeUserResponse(sender, "fechamento", "forma_pagamento", cleanedContent);
      await storeUserResponse(sender, "fechamento", "etapa", "fechamento_ask3");
      return await rotinaDeFechamento({ sender, msgContent: "", pushName });
    }

    case "fechamento_ask3": {
      const perguntas3 = [
        "Prefere receber em casa ou retirar na loja? 🚚🏪",
        "Entrega ou retirada na loja?",
        "Quer que a gente entregue ou prefere buscar?"
      ];

      const index3 = getNextIndex(respostas, "fechamento_3", perguntas3.length);
      await storeUserResponse(sender, "fechamento", "fechamento_3_index", index3);
      await storeUserResponse(sender, "fechamento", "etapa", "resposta_fechamento_3");
      return await sendBotMessage(sender, perguntas3[index3]);
    }

    case "resposta_fechamento_3": {
      await storeUserResponse(sender, "fechamento", "entrega_ou_retirada", cleanedContent);
      await storeUserResponse(sender, "fechamento", "etapa", "finalizacao_fechamento");
      return await rotinaDeFechamento({ sender, msgContent: "", pushName });
    }

    case "finalizacao_fechamento": {
      const finalRespostas = await getUserResponses(sender, "fechamento");

      const produto = finalRespostas.pergunta_1 || produto;
      const dataCompra = finalRespostas.data_compra;
      const formaPagamento = finalRespostas.forma_pagamento;
      const entregaOuRetirada = finalRespostas.entrega_ou_retirada;

      await agenteDeFechamento(
        sender,
        msgContent,
        produto,
        finalidadeUso,
        investimento,
        pushName,
        dataCompra,
        formaPagamento,
        entregaOuRetirada
      );

      await storeUserResponse(sender, "fechamento", "etapa", "aguardando_demonstracao");
      return;
    }
  }
};

module.exports = { rotinaDeFechamento };
