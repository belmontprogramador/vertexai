const { sendBotMessage } = require('../../messageSender');
const {
  setUserStage,
  getConversation,
  getNomeUsuario
} = require('../../redisService');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const rotinaDeAgendamento = async ({ sender, msgContent, pushName }) => {
  await setUserStage(sender, "agendamento");

  // 🔄 1. Resumo via GPT com base no histórico
  const historico = await getConversation(sender);
  const nomeCliente = await getNomeUsuario(sender);
  const conversaFormatada = historico
    .filter(m => !m.startsWith("again "))
    .slice(-15)
    .join(" | ");

  // Prompt para o GPT gerar o resumo
  const prompt = [
    {
      role: "system",
      content: `Você é um assistente comercial da Vertex Store. Gere um resumo breve do atendimento com foco em:\n- Interesse do cliente\n- Modelo(s) demonstrado(s)\n- Objeções respondidas\n- Dúvidas técnicas\n- Clima da negociação (frio, morno, quente)\n\nUse linguagem humanizada e objetiva.`
    },
    {
      role: "user",
      content: `📜 Histórico da conversa com ${nomeCliente || "cliente"}:\n${conversaFormatada}`
    }
  ];

  let resumoFinal = "Resumo indisponível no momento.";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: prompt,
      temperature: 0.7,
      max_tokens: 300
    });

    resumoFinal = completion.choices?.[0]?.message?.content?.trim() || resumoFinal;
  } catch (error) {
    console.error("Erro ao gerar resumo do atendimento:", error);
  }

  // 🔄 2. Envia o resumo para o número da loja/supervisor
  await sendBotMessage("21983735922", `📋 *Resumo do atendimento (${sender})*\n\n${resumoFinal}`);

  // 🔄 3. Continua o fluxo normal com o cliente
  await sendBotMessage(sender, "Para quando o(a) senhor(a) está planejando sua compra?");
};

module.exports = { rotinaDeAgendamento };
