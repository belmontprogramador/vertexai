const { sendBotMessage } = require("../../../messageSender");
const OpenAI = require("openai");
const { setUserStage } = require("../../../redisService");
const { listarHorariosDisponiveis } = require("../../../ServicesKommo/gerarDatasProximos15Dias");
// const { rotinaDeEntregaEmCasa } = require("./rotinaDeEntregaEmCasa");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const tools = [
  {
    type: "function",
    function: {
      name: "agendarVisitaNaLoja",
      description: "Cliente quer visitar a loja para retirar o produto ou finalizar a compra.",
      parameters: {
        type: "object",
        properties: {
          confirmacao: {
            type: "string",
            description: "Confirmação da intenção do cliente de ir até a loja."
          }
        },
        required: ["confirmacao"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "explicarEntregaEmCasa",
      description: "Cliente quer receber o produto em casa e precisa da explicação sobre isso.",
      parameters: {
        type: "object",
        properties: {
          confirmacao: {
            type: "string",
            description: "Confirmação da intenção do cliente de receber em casa."
          }
        },
        required: ["confirmacao"]
      }
    }
  }
];

const handlers = {
  agendarVisitaNaLoja: async ({ sender, msgContent, pushName }) => {
    await sendBotMessage(sender, `📅 Perfeito, ${pushName}! Vamos agendar sua visita à loja.`);
    await setUserStage(sender, "datas_15_dias");
    return await listarHorariosDisponiveis( sender);
  },
  explicarEntregaEmCasa: async ({ sender, msgContent, pushName }) => {
    await sendBotMessage(sender, `🚚 Ótimo ${pushName}! Vou te passar os detalhes da entrega em casa.`);
    await setUserStage(sender, "entrega_em_casa");
     return await listarDatasDisponiveis(sender);
  }
};

const agenteDeEntrega = async ({ sender, msgContent, pushName }) => {
  try {
    await setUserStage(sender, "etapa_de_entrega");

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `
Você é um assistente especializado em organizar a entrega na VertexStore.

1. Explique que o cliente pode escolher entre entrega em casa ou visita na loja.
2. Pergunte qual ele prefere.
3. Se ele responder, chame a ferramenta correspondente (visita ou entrega).
          `
        },
        { role: "user", content: msgContent }
      ],
      tools,
      tool_choice: "auto",
      temperature: 0.7
    });

    const resposta = completion.choices[0];

    // 🧠 Se o modelo decidiu usar uma tool
    if (resposta.finish_reason === "tool_calls" && resposta.message.tool_calls?.length > 0) {
      for (const call of resposta.message.tool_calls) {
        const { name, arguments: argsJson } = call.function;
        const args = JSON.parse(argsJson || "{}");
        if (handlers[name]) {
          return await handlers[name]({ sender, msgContent, pushName, ...args });
        }
      }
    }

    // Resposta padrão se nenhuma função for acionada
    return await sendBotMessage(sender, resposta.message.content || "📦 Você prefere receber em casa ou agendar uma visita?");
  } catch (err) {
    console.error("❌ Erro no agenteDeEntrega:", err);
    return await sendBotMessage(sender, "❌ Tive um problema ao organizar sua entrega. Pode tentar de novo?");
  }
};

module.exports = { agenteDeEntrega };
