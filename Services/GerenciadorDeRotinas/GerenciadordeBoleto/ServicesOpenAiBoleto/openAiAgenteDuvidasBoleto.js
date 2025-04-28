const { sendBotMessage } = require("../../../messageSender");
const { setUserStage } = require("../../../redisService");
const { rotinaDeAgendamento } = require("../../GerenciamentoDeAgendamento/rotinaDeAgendamento");
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const openAiAgenteDuvidasBoleto = async ({ sender, msgContent = "", pushName = "" }) => {
  await setUserStage(sender, "boleto_agente_duvidas");
// se o cliente perguntar por modelos trazer modelos do hall de boleto

  try {
    const userMessage = msgContent?.trim() || "Tenho dúvidas sobre o PayJoy.";

    const messages = [
      {
        role: "system",
        content: `
Você é um especialista da VertexStore no financiamento via PayJoy.
pergunte sempre de forma sucinta se ele quer agendar uma visita na loja
Responda dúvidas de forma clara, objetiva e amigável.
Se perceber que o usuário está pronto para avançar ou menciona interesse direto em comprar, chame a função agendarVisita direto sem convidar novamente par uma visita.
        `
      },
      { role: "user", content: userMessage }
    ];

    const functions = [
      {
        name: "agendarVisita",
        description: "Inicia o agendamento após o usuário tirar dúvidas ou demonstrar interesse."
      }
    ];

    const handlers = {
      agendarVisita: async () => {
        await sendBotMessage(sender, `📅 Perfeito, ${pushName}! Vamos agendar sua visita à loja.`);
        await rotinaDeAgendamento({ sender, msgContent, pushName });
      }
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages,
      functions,
      function_call: "auto",
      temperature: 0.7
    });

    const response = completion.choices[0];

    // 🧠 Se o modelo decidir chamar função
    if (response.finish_reason === "function_call" && response.message.function_call) {
      const { name: functionName } = response.message.function_call;
      if (handlers[functionName]) {
        return await handlers[functionName]();
      }
    }

    // ✅ Caso venha resposta direta
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

module.exports = { openAiAgenteDuvidasBoleto };
