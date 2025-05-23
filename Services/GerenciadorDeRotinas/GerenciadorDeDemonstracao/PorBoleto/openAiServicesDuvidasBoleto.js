const { sendBotMessage } = require("../../../messageSender");
const { setUserStage, storeChosenModel, getNomeUsuario, appendToConversation } = require("../../../redisService");
const { rotinaDeAgendamento } = require("../../GerenciadorDeAgendamento/rotinaDeAgendamento");
const { agenteDeDemonstracaoPorBoleto } = require("./agenteDeDemonstracaoPorBoleto");
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const handlers = {
  agendarVisita: async ({sender, msgContent, pushName}) => {
    await setUserStage(sender, "rotina_de_agendamento");
    await sendBotMessage(sender, `📅 Perfeito, ${pushName}! Vamos agendar sua visita à loja.`);
    return await rotinaDeAgendamento({ sender, msgContent, pushName });
  },

  identificarModeloPorBoleto: async (sender, args) => {
    const nome =await getNomeUsuario(sender)
    const { content, pushName } = args;
    await storeChosenModel(sender, content);
    await setUserStage(sender, "agente_de_demonstração_por_boleto");
    await sendBotMessage(sender, `📱 Entendi, ${nome}! Vou identificar o modelo que você deseja. Aguarde só um momento...`);
    return await agenteDeDemonstracaoPorBoleto({ sender, msgContent: content, pushName });
  }
};

const functions = [
  {
    name: "agendarVisita",
    description: "Inicia o agendamento após o usuário tirar dúvidas ou demonstrar interesse."
  },
  {
    name: "identificarModeloPorBoleto",
    description: "Usuário mencionou interesse em um modelo de celular. Deve salvar a informação e iniciar processo de identificação.",
    parameters: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "Mensagem original do usuário com o nome ou características do modelo."
        }
      },
      required: ["content"]
    }
  }
];

const openAiServicesDuvidasBoleto = async ({ sender, msgContent = "", pushName = "" }) => {
  await setUserStage(sender, "open_ai_services_duvidas_boleto");

  try {
    const userMessage = msgContent?.trim() || "Tenho dúvidas sobre o PayJoy.";

    // 🧠 Salva a mensagem no histórico para uso posterior
    await appendToConversation(sender, userMessage);

    const messages = [
      {
        role: "system",
        content: `
Você é um especialista da VertexStore no financiamento via PayJoy.
Pergunte sempre de forma sucinta se ele quer agendar uma visita na loja.
Responda dúvidas de forma clara, objetiva e amigável.
Se perceber que o usuário está pronto para avançar ou menciona interesse direto em comprar, chame a função agendarVisita direto sem convidar novamente para uma visita.
Se perceber que o usuário quer ver ou pergunta sobre algum modelo de celular, leve ele para identificarModeloPorBoleto.
        `
      },
      { role: "user", content: userMessage }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      functions,
      function_call: "auto",
      temperature: 0.7
    });

    const response = completion.choices[0];

    if (response.finish_reason === "function_call" && response.message.function_call) {
      const { name: functionName } = response.message.function_call;

      if (handlers[functionName]) {
        const args = response.message.function_call.arguments
          ? JSON.parse(response.message.function_call.arguments)
          : {};
        return await handlers[functionName](sender, { ...args, msgContent, pushName });
      }
    }

    const content = response.message?.content;
    if (content) {
      return await sendBotMessage(sender, content);
    }

    await sendBotMessage(sender, "🙂 Pode mandar sua dúvida sobre o financiamento PayJoy.");
  } catch (error) {
    console.error("❌ Erro no agente de dúvidas do boleto:", error);
    await sendBotMessage(sender, "❌ Ocorreu um erro ao responder sua dúvida. Pode tentar de novo?");
  }
};


module.exports = { openAiServicesDuvidasBoleto };
