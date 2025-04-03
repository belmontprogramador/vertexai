const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  getUserResponses
} = require("../../../redisService");
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Handlers para lidar com as funções
const handlers = {
  obterDataDaCompra: async (sender, produto, dataCompra, formaPagamento, entregaOuRetirada, pushName) => {
    await sendBotMessage(sender, `📅 ${pushName}, qual a data aproximada em que pretende realizar a compra?`);
  },

  obterFormaDePagamento: async (sender, produto, dataCompra, formaPagamento, entregaOuRetirada, pushName) => {
    await sendBotMessage(sender, `💳 Como pretende pagar? Dinheiro, Pix, cartão...?`);
  },

  obterFormaDeEntrega: async (sender, produto, dataCompra, formaPagamento, entregaOuRetirada, pushName) => {
    await sendBotMessage(sender, `🚚 Você prefere entrega em casa ou retirada na loja?`);
  },

  agendamentoDeCompra: async (sender, produto, dataCompra, formaPagamento, entregaOuRetirada, pushName) => {
    await sendBotMessage(
      sender,
      `✅ Saquei ${pushName}! Vamos te encaminhar para o agendamento com essas informações:\n\n🛒 Produto: ${produto}\n📅 Data: ${dataCompra}\n💳 Pagamento: ${formaPagamento}\n📍 Entrega/Retirada: ${entregaOuRetirada}`
    );
    await setUserStage(sender, "agendamento");
  }
};

// Funções que o GPT pode chamar
const functions = [
  {
    name: "obterDataDaCompra",
    description: "Perguntar ao cliente quando pretende realizar a compra.",
    parameters: {
      type: "object",
      properties: {
        pergunta: { type: "string", enum: ["dataCompra"] }
      },
      required: ["pergunta"]
    }
  },
  {
    name: "obterFormaDePagamento",
    description: "Perguntar ao cliente como pretende pagar.",
    parameters: {
      type: "object",
      properties: {
        pergunta: { type: "string", enum: ["formaPagamento"] }
      },
      required: ["pergunta"]
    }
  },
  {
    name: "obterFormaDeEntrega",
    description: "Perguntar ao cliente se prefere entrega ou retirada.",
    parameters: {
      type: "object",
      properties: {
        pergunta: { type: "string", enum: ["entregaOuRetirada"] }
      },
      required: ["pergunta"]
    }
  },
  {
    name: "agendamentoDeCompra",
    description: "Se todas as informações forem fornecidas, agendar diretamente.",
    parameters: {
      type: "object",
      properties: {
        dataCompra: { type: "string" },
        formaPagamento: { type: "string" },
        entregaOuRetirada: { type: "string" }
      },
      required: ["dataCompra", "formaPagamento", "entregaOuRetirada"]
    }
  }
];

// Função principal
const agenteDeFechamento = async (sender, msgContent, _produto, _finalidadeUso, _investimento, pushName, dataCompra, formaPagamento, entregaOuRetirada) => {
  await setUserStage(sender, "agente_de_fechamento");

  try {
    const respostas = await getUserResponses(sender, "fechamento");

    const produto = respostas.pergunta_1 || _produto;
    const data = respostas.data_compra || dataCompra;
    const pagamento = respostas.forma_pagamento || formaPagamento;
    const entrega = respostas.entrega_ou_retirada || entregaOuRetirada;

    // Se tiver tudo, vai direto para agendamento
    if (data && pagamento && entrega) {
      return await handlers.agendamentoDeCompra(sender, produto, data, pagamento, entrega, pushName);
    }

    // Usa o GPT para decidir o próximo passo
    const messages = [
      {
        role: "system",
        content: `Você é Anna, assistente de vendas da VertexStore. Verifique quais informações ainda faltam (data de compra, forma de pagamento ou entrega) e pergunte ao cliente.`
      },
      {
        role: "user",
        content: `Produto: ${produto || "NÃO INFORMADO"}, DataCompra: ${data || "NÃO INFORMADO"}, FormaPagamento: ${pagamento || "NÃO INFORMADO"}, EntregaOuRetirada: ${entrega || "NÃO INFORMADO"}`
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages,
      functions,
      function_call: "auto",
      temperature: 0.5
    });

    const response = completion.choices[0];

    if (response.finish_reason === "function_call" && response.message.function_call) {
      const functionName = response.message.function_call.name;
      const args = JSON.parse(response.message.function_call.arguments || "{}");

      if (handlers[functionName]) {
        return await handlers[functionName](
          sender,
          produto,
          args.dataCompra || data,
          args.formaPagamento || pagamento,
          args.entregaOuRetirada || entrega,
          pushName
        );
      }
    }

    // Mensagem fallback se não houver função
    return await sendBotMessage(sender, response.message.content || "❓ Pode me informar mais detalhes para finalizarmos o agendamento?");

  } catch (error) {
    console.error("❌ Erro no agente de fechamento:", error);
    return await sendBotMessage(sender, "❌ Ocorreu um erro ao processar sua solicitação. Tente novamente em instantes.");
  }
};

module.exports = { agenteDeFechamento };
