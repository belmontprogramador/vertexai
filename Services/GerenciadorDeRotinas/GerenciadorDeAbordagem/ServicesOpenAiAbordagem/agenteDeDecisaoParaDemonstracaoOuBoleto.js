const { sendBotMessage } = require("../../../messageSender");
const { setUserStage, getChosenModel } = require("../../../redisService");
const { identificarModeloEscolhido } = require("../../GerenciadordeDemonstracao/ServicesOpenAiDemonstracao/identificarModeloEscolhido");
const { rotinaDeBoleto } = require("../../GerenciadordeBoleto/rotinaDeBoleto");

const OpenAI = require("openai");
require("dotenv").config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 📦 Funções disponíveis para o modelo decidir
const functions = [
  {
    type: "function",
    function: {
      name: "seguir_para_demonstracao",
      description: "Chama esta função se o cliente demonstrar interesse em saber mais sobre o modelo de celular atual, com frases como 'quero ver esse modelo', 'me mostra esse', etc.",
      parameters: {
        type: "object",
        properties: {
          querDemonstracao: {
            type: "boolean",
            description: "Indica se o cliente quer seguir com a demonstração do modelo escolhido"
          }
        },
        required: ["querDemonstracao"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "seguir_para_boleto",
      description: "Chama esta função se o cliente demonstrar interesse em pagar no boleto ou quiser saber mais sobre parcelamento por boleto.",
      parameters: {
        type: "object",
        properties: {
          querBoleto: {
            type: "boolean",
            description: "Indica se o cliente quer pagar com boleto ou saber mais sobre a opção"
          }
        },
        required: ["querBoleto"]
      }
    }
  }
];

// 🧠 Handlers para cada função
const handlers = {
  seguir_para_demonstracao: async (sender, args, extras) => {
    const { msgContent, pushName } = extras;
    await setUserStage(sender, "agente_de_demonstração_capturar");
    return await identificarModeloEscolhido({ sender, msgContent, pushName });
  },

  seguir_para_boleto: async (sender, args, extras) => {
    const { msgContent, pushName } = extras;
    await setUserStage(sender, "boleto");
    return await rotinaDeBoleto({ sender, msgContent, pushName });
  }
};

// 🤖 Agente de decisão principal
const agenteDeDecisaoParaDemonstracaoOuBoleto = async ({ sender, msgContent, pushName }) => {
  const modeloEscolhido = await getChosenModel(sender);

  if (!modeloEscolhido) {
    await sendBotMessage(sender, "❌ Não encontrei o modelo salvo. Pode informar novamente?");
    return;
  }

  await setUserStage(sender, "agente_de_decisao_demo_ou_boleto");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: `
Você é a Anna, especialista da VertexStore.

O cliente acabou de receber sugestões de modelo e opções de pagamento.

Com base na resposta do cliente abaixo, decida se ele quer:
- seguir com a demonstração do modelo "${modeloEscolhido}" (caso diga "quero ver esse", "me mostra esse", "quero esse modelo", etc),
- ou se deseja saber mais sobre o pagamento via *boleto parcelado*.

Tome a decisão chamando a função correta:
- *seguir_para_demonstracao* para continuar com demonstração do modelo
- *seguir_para_boleto* para continuar com explicações sobre boleto parcelado
`
        },
        { role: "user", content: msgContent }
      ],
      tools: functions,
      tool_choice: "auto"
    });

    const choice = completion.choices[0];

    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls?.[0]) {
      const toolCall = choice.message.tool_calls[0];
      const funcName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments || "{}");

      if (handlers[funcName]) {
        return await handlers[funcName](sender, args, {
          msgContent,
          pushName
        });
      }
    }

    await sendBotMessage(sender, "🤖 Não consegui entender. Você quer ver o modelo ou prefere saber sobre o boleto?");
  } catch (err) {
    console.error("❌ Erro no agente de decisão demonstração/boleto:", err);
    await sendBotMessage(sender, "⚠️ Tive um problema ao tentar entender sua resposta. Pode repetir?");
  }
};

module.exports = { agenteDeDecisaoParaDemonstracaoOuBoleto };
