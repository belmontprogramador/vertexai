const { sendBotMessage } = require("../../../messageSender");
const {
    getLastInteraction,
    deleteUserResponses,
    getUserStage,
    setLastInteraction,
    setUserStage,
    storeUserMessage,
    setStageHistory, // ✅ correto
    getStageHistory
  } = require("../../../redisService");
const { rotinaDeSondagemDeCelular } = require("../../GerenciadorDeSondagem/rotinaDeSondagemDeCelular");

const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔹 Funções para lidar com cada categoria de interesse
const handlers = {
  consultarCelulares: async (sender, msgContent, pushName) => {
    await setUserStage(sender, "sondagem_de_celular");
    await rotinaDeSondagemDeCelular({ sender, msgContent, pushName });
  },
  consultarAcessorios: async (sender, msgContent, pushName) => {
    await sendBotMessage(sender, `🔌 Oi ${pushName}, trabalhamos com carregadores, fones e películas. Algum acessório específico?`);
  },
  consultarBoletos: async (sender, msgContent, pushName) => {
    await sendBotMessage(sender, `💳 Oi ${pushName}, sim, aceitamos boleto! Você deseja gerar um agora?`);
  },
  consultarOutros: async (sender, msgContent, pushName) => {
    await sendBotMessage(sender, `❓ Oi ${pushName}, poderia dar mais detalhes sobre sua dúvida para que eu possa te ajudar melhor?`);
  },
};

// 🔹 Definição das funções disponíveis (tools)
const functions = [
  { name: "consultarCelulares", description: "Usuário interessado em celulares.", parameters: { type: "object", properties: { interesse: { type: "string", enum: ["celulares"] } }, required: ["interesse"] } },
  { name: "consultarAcessorios", description: "Usuário interessado em acessórios.", parameters: { type: "object", properties: { interesse: { type: "string", enum: ["acessorios"] } }, required: ["interesse"] } },
  { name: "consultarBoletos", description: "Usuário menciona boletos ou pagamentos.", parameters: { type: "object", properties: { interesse: { type: "string", enum: ["boletos"] } }, required: ["interesse"] } },
  { name: "consultarOutros", description: "Usuário menciona algo fora das categorias.", parameters: { type: "object", properties: { interesse: { type: "string", enum: ["outros"] } }, required: ["interesse"] } },
];

// 🔹 Função principal para rodar o agente de sondagem
const agenteDeDefiniçãoDeSondagem= async (sender, msgContent, pushName) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "Você é Anna, assistente de vendas da VertexStore. Seu objetivo é entender o interesse do usuário e escolher a ação correta." },
        { role: "user", content: msgContent }
      ],
      functions,
      temperature: 0.7,
    });

    const response = completion.choices[0];

    if (response.finish_reason === "function_call") {
      const functionName = response.message.function_call.name;
      if (handlers[functionName]) {
        await handlers[functionName](sender, msgContent, pushName);
      } else {
        await sendBotMessage(sender, "❌ Desculpe, não consegui identificar sua solicitação.");
      }
    } else {
      await sendBotMessage(sender, `🔍 ${response.message.content}`);
    }
  } catch (error) {
    console.error("Erro no agente de sondagem:", error);
    await sendBotMessage(sender, "❌ Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.");
  }
};

module.exports = { agenteDeDefiniçãoDeSondagem };
