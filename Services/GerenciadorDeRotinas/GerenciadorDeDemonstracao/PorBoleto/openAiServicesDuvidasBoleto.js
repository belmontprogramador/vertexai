const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  storeChosenModel,
  getNomeUsuario,
  appendToConversation,
  getConversation
} = require("../../../redisService");
const { rotinaDeAgendamento } = require("../../GerenciadorDeAgendamento/rotinaDeAgendamento");
const { agenteDeDemonstracaoPorBoleto } = require("./agenteDeDemonstracaoPorBoleto");
const { informacoesPayjoy } = require("../../../utils/informacoesPayjoy");
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const handlers = {
  agendarVisita: async ({ sender, msgContent, pushName }) => {
    await setUserStage(sender, "rotina_de_agendamento");
    await sendBotMessage(sender, `📅 Perfeito, ${pushName}! Vamos agendar sua visita à loja.`);
    return await rotinaDeAgendamento({ sender, msgContent, pushName });
  },

  identificarModeloPorBoleto: async (sender, args) => {
    const nome = await getNomeUsuario(sender);
    const { content, pushName } = args;
    await storeChosenModel(sender, content);
    await setUserStage(sender, "agente_de_demonstração_por_boleto");
    await sendBotMessage(sender, `📱 Entendi, ${nome}! No momento disponível no boleto temos esses modelos e preços.`);
    await sendBotMessage(sender, `📱 Lembrando que todas as definições de preço devem ser feitas após análise de crédito feita em loja.`);
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
    description: "Usuário mencionou interesse em um modelo de celular ou perguntou sobre valores dos aparelhos. Deve salvar a informação e iniciar processo de identificação.",
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

  try {
    const userMessage = msgContent?.trim() || "Tenho dúvidas sobre o PayJoy.";

    // 🧠 Salva a mensagem no histórico
    await appendToConversation(sender, userMessage);

    // 🧠 Recupera histórico completo (últimas 10 interações)
    const historico = await getConversation(sender);
    const historicoCompleto = historico.slice(-10).join(" | ");

    const messages = [
      {
        role: "system",
        content: `
Você é um especialista da VertexStore no financiamento via PayJoy.

Regras obrigatórias:
- Pergunte de forma sucinta se o cliente quer agendar uma visita.
- Responda dúvidas com clareza, simpatia e objetividade utlizando (DOCUMENTAÇÃO COMPLETA:)
- Se o cliente mencionar que quer ver celulares, modelos, aparelhos ou perguntar por *valores*, *preços*, *promoções* ou *ofertas*, chame a função identificarModeloPorBoleto com a última mensagem como argumento.
- Se o cliente estiver pronto para comprar, chame direto a função agendarVisita, sem perguntar de novo.

🧾 DOCUMENTAÇÃO COMPLETA:
${JSON.stringify(informacoesPayjoy).slice(0, 3500)}

📜 Histórico da conversa:
${historicoCompleto}
        `.trim()
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
