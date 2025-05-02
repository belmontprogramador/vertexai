const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  getChosenModel,
  getIntencaoDeUso
} = require("../../../redisService");
const { OpenAI } = require("openai");
const { agenteDeDemonstracaoDetalhada } = require("./agenteDeDemonstraçãoDetalhada");
const { rotinaDeAgendamento } = require("../../GerenciamentoDeAgendamento/rotinaDeAgendamento");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔹 Função para decidir a próxima ação do usuário
const decidirProximaAcao = async (msgContent) => {
  try {
    const resposta = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `
Você é um classificador de intenção. 
Sua tarefa é retornar apenas:
- "mais_informacoes" se o usuário quiser saber mais detalhes do celular.
- "agendar_visita" se o usuário quiser agendar uma visita para comprar o celular.
`
        },
        { role: "user", content: msgContent }
      ],
      functions: [
        {
          name: "decidirProximaAcaoPosDemo",
          description: "Decide se o usuário quer mais informações ou deseja agendar uma visita.",
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

    if (!chamada) {
      console.error("❌ Erro: function_call não retornada pela OpenAI:", JSON.stringify(resposta, null, 2));
      return "mais_informacoes"; // fallback inteligente
    }

    const { acao } = JSON.parse(chamada.arguments);
    return acao;
  } catch (error) {
    console.error("❌ Erro ao tentar classificar a decisão:", error);
    return "mais_informacoes"; // fallback inteligente
  }
};

// 🔹 Agente de decisão após demonstração
const agenteDeDecisaoPosDemonstracao = async ({ sender, msgContent, pushName, extras = {} }) => {
  try {
    const decisao = await decidirProximaAcao(msgContent);

    if (decisao === "mais_informacoes") {
      await setUserStage(sender, "agente_de_demonstração_detalhada");
      return await agenteDeDemonstracaoDetalhada({ sender, msgContent, pushName });
    }

    if (decisao === "agendar_visita") {
      await setUserStage(sender, "rotina_de_agendamento");

      // 🔥 Aqui executamos direto o agendamento
      const { modeloEscolhido, finalidade, investimento } = extras;

      await sendBotMessage(sender, `🎯 Perfeito! Vamos agendar agora sua visita para garantir seu ${modeloEscolhido || "produto"}.`);

      return await rotinaDeAgendamento({
        sender,
        pushName,
        msgContent,
        produto: modeloEscolhido || "Produto",
        finalidadeUso: finalidade || "Uso não especificado",
        investimento: investimento || "Investimento não informado"
      });
    }

    // fallback
    await sendBotMessage(sender, "❌ Não entendi... Você quer saber mais detalhes ou prefere agendar uma visita?");
  } catch (error) {
    console.error("❌ Erro no agenteDeDecisaoPosDemonstracao:", error);
    await sendBotMessage(sender, "⚠️ Tive um problema técnico ao tentar interpretar sua resposta. Pode repetir?");
  }
};

module.exports = { agenteDeDecisaoPosDemonstracao };
