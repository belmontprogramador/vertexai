const { sendBotMessage } = require("../../../messageSender");
const { setUserStage } = require("../../../redisService");
const { rotinaDeEntrega } = require("../RotinaDeEntrega/rotinaDeEntrega");
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const functions = [
  {
    name: "seguirParaEntrega",
    description: "Cliente decidiu seguir para a entrega após tirar dúvidas sobre o boleto.",
    parameters: {
      type: "object",
      properties: {
        confirmacao: {
          type: "string",
          description: "Frase de confirmação do cliente para seguir"
        }
      },
      required: ["confirmacao"]
    }
  }
];

const handlers = {
  seguirParaEntrega: async ({ sender, msgContent, pushName }) => {
    await sendBotMessage(sender, `📦 Fechado, ${pushName}! Vamos avançar para a entrega.`);
    await setUserStage(sender, "entrega");
    return await rotinaDeEntrega({ sender, msgContent, pushName });
  }
};

const AgenteExplicacaoBoleto = async ({ sender, msgContent = "", pushName = "" }) => {
  const userMessage = msgContent?.trim() || "Tenho dúvidas sobre o boleto.";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `
Você é um especialista da VertexStore em boleto parcelado.

1. Explique que o pagamento pode ser parcelado em até 10x.
2. Diga que a análise do boleto é feita presencialmente com biometria.
3. Finalize sempre com a pergunta: 👉 *Quer seguir para entrega ou tem mais alguma dúvida sobre o boleto?*
4. Se o cliente quiser seguir, chame a função "seguirParaEntrega".
        `
        },
        { role: "user", content: userMessage }
      ],
      functions,
      function_call: "auto",
      temperature: 0.7
    });

    const response = completion.choices[0];

    // 🔁 Se a IA chamou a função explicitamente
    if (response.finish_reason === "function_call" && response.message.function_call) {
      const args = JSON.parse(response.message.function_call.arguments || "{}");
      return await handlers.seguirParaEntrega({ sender, msgContent, pushName, ...args });
    }

    // 🧠 Se a IA respondeu por texto e já sugeriu a entrega
    const resposta = response.message?.content || "";
    const lowerResposta = resposta.toLowerCase();

    const indicativos = [
      "vamos seguir", "vamos para entrega", "pode seguir",
      "fechado", "quero receber", "pode continuar", "próxima etapa", "prosseguir"
    ];

    const desejaSeguir = indicativos.some(f => lowerResposta.includes(f));

    if (desejaSeguir) {
      // ⚠️ Aqui é onde estava o loop: tentava continuar no mesmo fluxo
      return await handlers.seguirParaEntrega({ sender, msgContent, pushName, confirmacao: "seguindo" });
    }

    // ✅ Se não quiser seguir ainda, apenas responde e mantém o stage
    await setUserStage(sender, "boleto_agente_fluxo");
    return await sendBotMessage(sender, resposta || "📩 Pode mandar sua dúvida sobre o boleto que te explico!");
  } catch (error) {
    console.error("❌ Erro no agente de dúvidas do boleto:", error);
    return await sendBotMessage(sender, "❌ Ocorreu um erro ao responder sua dúvida. Pode tentar de novo?");
  }
};

module.exports = { AgenteExplicacaoBoleto };
