const { sendBotMessage } = require("../../../messageSender");
const { setUserStage } = require("../../../redisService");
const { rotinaDeSondagemDeCelular } = require("../../GerenciadorDeSondagem/rotinaDeSondagemDeCelular");
const { agenteHallDeBoleto } = require("../../GerenciadordeBoleto/ServicesOpenAiBoleto/agenteHallDeBoleto");

const OpenAI = require("openai");
require("dotenv").config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const functions = [
  {
    name: "seguir_para_boleto",
    description: "Cliente quer pagar via boleto, fazer crediário ou parcelar sem cartão.",
    parameters: {
      type: "object",
      properties: {
        querBoleto: {
          type: "boolean",
          description: "Cliente confirmou que deseja boleto ou crediário"
        }
      },
      required: ["querBoleto"]
    }
  },
  {
    name: "voltar_para_sondagem",
    description: "Cliente não quer boleto, quer voltar para outras formas de pagamento ou trocar de produto.",
    parameters: {
      type: "object",
      properties: {
        querBoleto: {
          type: "boolean",
          description: "Cliente recusou boleto e quer voltar"
        }
      },
      required: ["querBoleto"]
    }
  }
];

const handlers = {
  seguir_para_boleto: async (sender, args, extras) => {
    const { msgContent, pushName } = extras;
    await setUserStage(sender, "hall_de_boleto");
    return await agenteHallDeBoleto({ sender, msgContent, pushName });
  },

  voltar_para_sondagem: async (sender, args, extras) => {
    const { msgContent, pushName } = extras;
    await setUserStage(sender, "sondagem_de_celular");
    return await rotinaDeSondagemDeCelular({ sender, msgContent, pushName });
  }
};

const agenteDeDecisaoParaBoletoOuSondagem = async ({ sender, msgContent, pushName }) => {
  try {
    // fallback direto para boleto se a mensagem for claramente sobre isso
    if (/\bboleto\b|\bcredi[áa]rio\b/i.test(msgContent)) {
      return await handlers.seguir_para_boleto(sender, { querBoleto: true }, { msgContent, pushName });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `
Você é Anna, especialista da VertexStore.

Com base na resposta abaixo, decida se o cliente quer:
✅ continuar com pagamento via boleto (parcelado, sem cartão, crediário, etc)
🔄 ou deseja voltar para ver outros produtos ou outras formas de pagamento.

Use:
- seguir_para_boleto se disser algo como "quero boleto", "parcelar no boleto", "quero crediário", "boleto sim", "gostei do boleto", "pagar no boleto", "sem cartão"
- voltar_para_sondagem se disser "não", "não quero boleto", "quero Pix", "quero outro produto", "cartão".
`
        },
        { role: "user", content: msgContent }
      ],
      functions,
      function_call: "auto",
      temperature: 0.7
    });

    console.dir(completion.choices[0], { depth: null });

    const toolCalls = completion.choices[0].message.function_call;
    if (toolCalls) {
      const funcName = toolCalls.name;
      const args = JSON.parse(toolCalls.arguments || "{}");

      if (handlers[funcName]) {
        return await handlers[funcName](sender, args, { msgContent, pushName });
      }
    }

    await sendBotMessage(sender, "🤖 Não consegui entender. Você quer pagar no boleto ou prefere ver outras opções?");
  } catch (err) {
    console.error("❌ Erro no agente de decisão boleto/sondagem:", err);
    await sendBotMessage(sender, "⚠️ Ocorreu um erro ao tentar entender sua resposta. Pode tentar novamente?");
  }
};

module.exports = { agenteDeDecisaoParaBoletoOuSondagem };