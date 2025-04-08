// arquivo: agenteDePagamento.js
const {
  setLastInteraction,
  setUserStage,
  getUserStage,
  storeUserResponse,
  getUserResponses
} = require('../../../redisService');

const { sendBotMessage } = require("../../../messageSender");
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Importa agentes específicos
const { agentePix } = require("./agentePix");
const { agenteCartao } = require("./agenteCartao");
const { explicacaoBoleto } = require("./explicacaoBoleto");

const functions = [
  {
    name: "definirFormaPagamento",
    description: "Define a forma de pagamento escolhida pelo cliente.",
    parameters: {
      type: "object",
      properties: {
        forma: {
          type: "string",
          enum: ["pix", "cartao", "boleto"],
          description: "Forma de pagamento escolhida (pix, cartao ou boleto)."
        }
      },
      required: ["forma"]
    }
  }
];

const handlers = {
  definirFormaPagamento: async (sender, args, extras) => {
    const { forma } = args;
  
    switch (forma) {
      case "pix":
        await setUserStage(sender, "pagamento_pix")
        return await agentePix({ sender, ...extras });
  
      case "cartao":
        await setUserStage(sender, "pagamento_cartao")
        return await agenteCartao({ sender, ...extras });
  
      case "boleto": 
      await setUserStage(sender, "pagamento_boleto")
      return await explicacaoBoleto({ sender, ...extras });
  
      default:
        return await sendBotMessage(sender, "❌ Não consegui identificar sua forma de pagamento. Pode repetir?");
    }
  }
  
};

const agenteDePagamento = async ({ sender, msgContent, pushName, ...extras }) => {
  console.log('entrei dentro do agente de pagamento')
  await setUserStage(sender, "agente_de_pagamento")
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `Você é um assistente que ajuda o cliente a entender as formas de pagamento disponíveis: Pix, Cartão ou Boleto. Pergunte qual ele prefere e interprete a resposta corretamente.`
        },
        {
          role: "user",
          content: msgContent
        }
      ],
      functions,
      function_call: "auto",
      temperature: 0.7,
      max_tokens: 300
    });

    const choice = completion.choices[0];
    if (choice.finish_reason === "function_call" && choice.message.function_call) {
      const funcName = choice.message.function_call.name;
      const args = JSON.parse(choice.message.function_call.arguments || "{}");

      if (handlers[funcName]) {
        return await handlers[funcName](sender, args, { sender, msgContent, ...extras });
      }
    }

    const resposta = choice.message.content;
    await sendBotMessage(sender, resposta || "❌ Pode repetir sua forma de pagamento?");
  } catch (err) {
    console.error("❌ Erro no agente de pagamento:", err);
    await sendBotMessage(sender, "❌ Tive um problema para entender sua forma de pagamento. Pode tentar novamente?");
  }
};

module.exports = { agenteDePagamento };
