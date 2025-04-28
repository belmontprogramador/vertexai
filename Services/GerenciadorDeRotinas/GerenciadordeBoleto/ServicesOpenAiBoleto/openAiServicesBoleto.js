const { sendBotMessage } = require("../../../messageSender");
const { setUserStage } = require("../../../redisService");
const { rotinaDeAgendamento } = require("../../GerenciamentoDeAgendamento/rotinaDeAgendamento");
const { openAiAgenteDuvidasBoleto } = require("./openAiAgenteDuvidasBoleto");
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const handlers = {
  tirarDuvidas: async (sender, args) => {
    const { msgContent, pushName } = args;
    await setUserStage(sender, "boleto_agente_duvidas");
    return await openAiAgenteDuvidasBoleto({ sender, msgContent, pushName });
  },

  preAprovacao: async (sender, args) => {
    const { pushName } = args;
    await setUserStage(sender, "boleto_agente");
    return await sendBotMessage(
      sender,
      `✅ ${pushName}, com seus dados conseguimos uma pré-aprovação de 90%! Lembrando que toda analise definitiva é feito em loja! Gostaria de agendar uma visita para realizar sua nalise definitiva ou tirar mais dúvidas?`
    );
  },

  agendarVisita: async (sender, args) => {
    const { msgContent, pushName } = args;
    await setUserStage(sender, "agendamento");
    await sendBotMessage(sender, `📅 Perfeito, ${pushName}! Vamos agendar sua visita.`);
    return await rotinaDeAgendamento({ sender, msgContent, pushName });
  }
  // se o cliente perguntar por modelos trazer modelos do hall de boleto
};

const functions = [
  {
    name: "tirarDuvidas",
    description: "Encaminha para agente especializado em responder dúvidas sobre a PayJoy.",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string", description: "Texto da dúvida do usuário." }
      },
      required: ["content"]
    }
  },
  {
    name: "preAprovacao",
    description: "Informa que o cliente foi pré-aprovado e pergunta se ele quer agendar ou tirar dúvidas."
  },
  {
    name: "agendarVisita",
    description: "Inicia a rotina de agendamento da visita."
  }
];

const openAiServicesBoleto = async ({ sender, msgContent = "", pushName = "" }) => {
  try {
    const userMessage = msgContent?.trim() || "Quero saber sobre boleto parcelado.";
    await setUserStage(sender, "boleto_agente");

    const messages = [
      {
        role: "system",
        content: `
Você é um agente decisor da VertexStore. Sua única função é identificar o que o usuário deseja com base na mensagem:

1️⃣ Se o usuário mandar nome, CPF e data de nascimento → chame **preAprovacao**
2️⃣ Se perguntar algo sobre financiamento, parcelas, bloqueio, juros, disser quem tem duvidas etc → chame **tirarDuvidas**
3️⃣ Se disser claramente que quer agendar → chame **agendarVisita**

Nunca responda diretamente. Apenas escolha a função correta.`
      },
      { role: "user", content: userMessage }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages,
      functions,
      function_call: "auto",
      temperature: 0.3
    });

    const response = completion.choices[0];

    if (response.finish_reason === "function_call" && response.message.function_call) {
      const { name: functionName, arguments: argsString } = response.message.function_call;
      const args = argsString ? JSON.parse(argsString) : {};

      if (handlers[functionName]) {
        return await handlers[functionName](sender, { ...args, msgContent, pushName });
      }
    }

    return await sendBotMessage(sender, "❌ Não consegui identificar se você quer tirar dúvidas ou agendar. Pode repetir?");
  } catch (error) {
    console.error("❌ Erro no agente decisor de boleto:", error);
    return await sendBotMessage(sender, "❌ Erro ao processar sua solicitação sobre boleto. Tente novamente mais tarde.");
  }
};

module.exports = { openAiServicesBoleto };