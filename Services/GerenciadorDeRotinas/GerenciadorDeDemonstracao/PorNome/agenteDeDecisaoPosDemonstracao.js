const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  getChosenModel
} = require("../../../redisService");
const { OpenAI } = require("openai");
const { agenteDeDemonstracaoDetalhada } = require("../agenteDeDemonstracaoDetalhada");
const { rotinaDeAgendamento } = require("../../GerenciadorDeAgendamento/rotinaDeAgendamento");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const decidirProximaAcao = async (msgContent) => {
  try {
    const resposta = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `
Você é um classificador de intenção de compra.

A partir da mensagem do cliente, decida entre:
- "mais_informacoes" se ele quer saber mais sobre o produto.
- "agendar_visita" se ele quiser agendar a compra.

Responda com apenas um dos dois termos.`
        },
        { role: "user", content: msgContent }
      ],
      functions: [
        {
          name: "decidirProximaAcaoPosDemo",
          description: "Classifica a intenção do usuário após a demonstração",
          parameters: {
            type: "object",
            properties: {
              acao: {
                type: "string",
                enum: ["mais_informacoes", "agendar_visita"]
              }
            },
            required: ["acao"]
          }
        }
      ],
      function_call: "auto"
    });

    const chamada = resposta.choices[0]?.message?.function_call;

    if (!chamada) return "mais_informacoes";

    const { acao } = JSON.parse(chamada.arguments);
    return acao;
  } catch (error) {
    console.error("❌ Erro ao classificar decisão:", error);
    return "mais_informacoes";
  }
};

const agenteDeDecisaoPosDemonstracao = async ({ sender, msgContent, pushName, extras = {} }) => {
  try {
    const modeloEscolhidoRaw = extras.modeloEscolhido || await getChosenModel(sender);
    const modeloEscolhido = typeof modeloEscolhidoRaw === "string" ? modeloEscolhidoRaw.trim() : "produto";

    const decisao = await decidirProximaAcao(msgContent);

    if (decisao === "mais_informacoes") {
      await setUserStage(sender, "agente_de_demonstração_detalhada");
      return await agenteDeDemonstracaoDetalhada({ sender, msgContent, pushName });
    }

    if (decisao === "agendar_visita") {
      await setUserStage(sender, "rotina_de_agendamento");
      await sendBotMessage(sender, `🎯 Perfeito! Vamos agendar agora sua visita para garantir seu ${modeloEscolhido}.`);
      return await rotinaDeAgendamento({ sender, pushName, msgContent });
    }

    await sendBotMessage(sender, "❌ Não entendi... Você quer saber mais detalhes ou prefere agendar uma visita?");
  } catch (error) {
    console.error("❌ Erro no agenteDeDecisaoPosDemonstracao:", error);
    await sendBotMessage(sender, "⚠️ Tive um problema técnico ao tentar interpretar sua resposta. Pode repetir?");
  }
};

module.exports = { agenteDeDecisaoPosDemonstracao };
