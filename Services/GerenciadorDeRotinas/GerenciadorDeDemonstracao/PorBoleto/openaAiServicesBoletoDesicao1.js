const { sendBotMessage } = require("../../../messageSender");
const { setUserStage } = require("../../../redisService");
const { rotinaDeDemonstracaoDeCelularPorValor } = require("../../GerenciadorDeDemonstracao/PorValor/rotinaDeDemonstracaoDeCelularPorValor");
const { rotinaDeBoleto } = require("./rotinaDeBoleto");

const OpenAI = require("openai");
require("dotenv").config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const handlers = {
  seguir_para_boleto: async (sender, args, extras) => {
    const { msgContent, pushName } = extras;
    await setUserStage(sender, "rotina_de_boleto");
    return await rotinaDeBoleto({ sender, msgContent, pushName });
  },

  voltar_para_sondagem: async (sender, args, extras) => {
    const { msgContent, pushName } = extras;
    await setUserStage(sender, "rotina_de_demonstracao_de_celular_por_valor");
    return await rotinaDeDemonstracaoDeCelularPorValor({ sender, msgContent, pushName });
  }
};

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

const openaAiServicesBoletoDesicao1 = async ({ sender, msgContent, pushName }) => {
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
Você é uma assistente especialista da VertexStore. Sua única função agora é identificar se o cliente quer pagar via boleto ou se ele quer outra forma de pagamento (como cartão ou Pix).

Regras:

✅ Use a função **seguir_para_boleto** se o cliente disser claramente que quer:
- boleto
- crediário
- parcelar sem cartão
- pagar sem cartão
- financiar com nome sujo

🔁 Use a função **voltar_para_sondagem** se o cliente disser ou sugerir que:
- quer pagar com cartão
- quer Pix, débito, crédito
- não quer boleto
- prefere outra forma de pagamento
- quer voltar a ver modelos

⚠️ IMPORTANTE:
- Nunca escolha boleto se ele mencionar cartão, Pix ou outras formas de pagamento.
- Se não tiver certeza absoluta, use **voltar_para_sondagem**
- Responda sempre com uma **function_call**, nunca gere conteúdo direto.
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

module.exports = { openaAiServicesBoletoDesicao1 };