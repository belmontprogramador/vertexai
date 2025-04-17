const { sendBotMessage } = require("../../../messageSender");
const { setUserStage } = require("../../../redisService");
const { rotinaDeSondagemDeCelular } = require("../../GerenciadorDeSondagem/rotinaDeSondagemDeCelular");
const { agenteHallDeBoleto } = require("../../GerenciadordeBoleto/ServicesOpenAiBoleto/agenteHallDeBoleto");

const OpenAI = require("openai");
require("dotenv").config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 📦 Funções disponíveis para o modelo decidir
const functions = [
  {
    type: "function",
    function: {
      name: "seguir_para_boleto",
      description: "Chame esta função se o cliente demonstrar intenção clara de pagar via boleto, fazer crediário, parcelar com entrada ou se mostra animado com a ideia de parcelar sem cartão. Também chame esta função se ele mencionar interesse em 'parcelar no boleto', 'pagar com entrada', 'não tenho cartão', 'como funciona o crediário', ou frases semelhantes.",
      parameters: {
        type: "object",
        properties: {
          querBoleto: {
            type: "boolean",
            description: "Indica se o cliente quer pagar com boleto, fazer crediário ou seguir nessa opção de pagamento."
          }
        },
        required: ["querBoleto"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "voltar_para_sondagem",
      description: "Chame esta função se o cliente expressar que quer ver outras opções de pagamento como Pix, Cartão, ou mesmo trocar de produto. Também chame esta função se ele usar frases como 'tem Pix?', 'posso pagar no cartão?', 'quero outro modelo', 'boleto não', 'não quero parcelar assim'.",
      parameters: {
        type: "object",
        properties: {
          querBoleto: {
            type: "boolean",
            description: "Indica que o cliente não quer boleto e deseja voltar para sondagem de produtos ou formas de pagamento."
          }
        },
        required: ["querBoleto"]
      }
    }
  }
  
];

// 🧠 Handlers para cada função
const handlers = {
  seguir_para_boleto: async (sender, args, extras) => {
    const { msgContent, pushName } = extras;
    const boleto = await setUserStage(sender, "boleto_agente");
    console.log(`${boleto}, to nesse estagio`)
    return await agenteHallDeBoleto({ sender, msgContent, pushName });
  },

  voltar_para_sondagem: async (sender, args, extras) => {
    const { msgContent, pushName } = extras;
    const boleto2 = await setUserStage(sender, "sondagem_de_celular");
    console.log(`${boleto2}, to nesse estagio`)
    return await rotinaDeSondagemDeCelular({ sender, msgContent, pushName });
  }
};

// 🤖 Agente de decisão
const agenteDeDecisaoParaBoletoOuSondagem = async ({ sender, msgContent, pushName }) => {
  await setUserStage(sender, "agente_de_decisao_boleto_ou_sondagem");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: `
Você é Anna, especialista da VertexStore.

O cliente acabou de receber informações sobre opções de pagamento.

Com base na resposta do cliente abaixo, decida se ele quer:
- seguir com a explicação sobre pagamento via *boleto parcelado* (caso diga "quero boleto", "quero pagar no boleto", "tem parcelamento no boleto", etc),
- ou se deseja voltar para ver outras opções de produto ou pagamento.

Tome a decisão chamando a função correta:
- *seguir_para_boleto* para continuar com boleto
- *voltar_para_sondagem* para retornar à escolha de produtos ou opções
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

    await sendBotMessage(sender, "🤖 Não consegui entender. Você quer pagar no boleto ou prefere voltar para outras opções?");
  } catch (err) {
    console.error("❌ Erro no agente de decisão boleto/sondagem:", err);
    await sendBotMessage(sender, "⚠️ Ocorreu um erro ao tentar entender sua resposta. Pode tentar novamente?");
  }
};

module.exports = { agenteDeDecisaoParaBoletoOuSondagem };
