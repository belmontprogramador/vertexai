const { sendBotMessage } = require("../../../messageSender");
const { setUserStage } = require("../../../redisService");
const { rotinaDeAgendamento } = require("../../GerenciamentoDeAgendamento/rotinaDeAgendamento");
const { pipelineBoleto } = require('../../../ServicesKommo/pipelineBoleto')
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const handlers = {
  explicarBoletoParcelado: async (sender, pushName) => {
    await sendBotMessage(
      sender,
      "📄 Parcelamos o boleto pela Enjoy em até 10 vezes, mediante aprovação. Para verificar sua aprovação, envie seu nome, CPF e data de nascimento."
    );
  },
  preAprovacao: async (sendeer) => {
    await sendBotMessage(
      sender,
      "✅ Com essas informações, você já possui uma pré-aprovação de 90%! Tem alguma dúvida ou gostaria de agendar uma visita à loja para finalizar?"
    );
  },
  tirarDuvidas: async (sender, args) => {
    const content = typeof args === "string" ? args : args?.content;
    await sendBotMessage(sender, content || "😊 Posso te ajudar com qualquer dúvida sobre o boleto parcelado.");
    await sendBotMessage(sender, "📍 Gostaria de aproveitar e já agendar uma visita em nossa loja?");
  },
  agendarVisita: async (sender,  msgContent, pushName) => {
    await sendBotMessage(sender, `📅 Perfeito, ${pushName}! Vamos agendar sua visita.`);
    await rotinaDeAgendamento({sender, msgContent, pushName});
  }
};

const functions = [
  {
    name: "explicarBoletoParcelado",
    description: "Explica como funciona o boleto parcelado via Enjoy"
  },
  {
    name: "preAprovacao",
    description: "Responde que o usuário já tem 90% de pré-aprovação."
  },
  {
    name: "tirarDuvidas",
    description: "Responde dúvidas gerais sobre o boleto e convida para agendamento.",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string", description: "Texto explicativo da dúvida." }
      },
      required: ["content"]
    }
  },
  {
    name: "agendarVisita",
    description: "Inicia a rotina de agendamento da visita."
  }
];

const openAiServicesBoleto = async (sender, msgContent = "", pushName = "") => {
  await setUserStage(sender, "boleto");

  try {
    const userMessage = msgContent?.trim() || "Quero saber sobre boleto parcelado.";

    const messages = [
      {
        role: "system",
        content: `
          Você é um assistente da VertexStore. Explique que o boleto pode ser parcelado em até 10x pela Enjoy, mediante aprovação.
          Se o usuário enviar nome, CPF e nascimento, diga que ele tem 90% de pré-aprovação.
          Se tiver dúvidas, responda.
          Se quiser, agende uma visita na loja.
          reposnda que tem juros.        
        `
      },
      {
        role: "user",
        content: userMessage
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
      const { name: functionName, arguments: argsString } = response.message.function_call;
      const args = argsString ? JSON.parse(argsString) : {};

      if (handlers[functionName]) {
        return await handlers[functionName](sender, { ...args, msgContent, pushName });

      }
    }

    const content = response.message?.content;
    if (content) {
      return await sendBotMessage(sender, content);
    }

    await sendBotMessage(sender, "😊 Posso te ajudar com qualquer dúvida sobre o boleto parcelado.");
  } catch (error) {
    console.error("❌ Erro no agente de boleto Enjoy:", error);
    await sendBotMessage(sender, "❌ Ocorreu um erro ao processar sua dúvida sobre o boleto. Tente novamente mais tarde.");
  }
};

module.exports = { openAiServicesBoleto };
