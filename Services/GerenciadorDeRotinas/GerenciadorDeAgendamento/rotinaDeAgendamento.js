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

  const historico = await getConversation(sender);
  const nomeCliente = await getNomeUsuario(sender);

  // 🧠 Extração do modelo sugerido a partir do histórico
  const trechoComModelo = historico.find(m => m.includes("modelo_sugerido_json:"));
  let modeloEscolhido = null;

  if (trechoComModelo) {
    try {
      const jsonString = trechoComModelo.split("modelo_sugerido_json:")[1].trim();
      modeloEscolhido = JSON.parse(jsonString);
    } catch (e) {
      console.warn("Erro ao parsear modelo_sugerido_json:", e);
    }
  }

  const conversaFormatada = historico
    .filter(m => !m.startsWith("again "))
    .slice(-15)
    .join(" | ");

  // Prompt para o GPT gerar o resumo
  const prompt = [
    {
      role: "system",
      content: `Você é um assistente comercial da Vertex Store. Gere um resumo breve do atendimento com foco em:
- Interesse do cliente
- Modelo(s) demonstrado(s)
- Objeções respondidas
- Dúvidas técnicas
- Clima da negociação (frio, morno, quente)

Use linguagem humanizada e objetiva.`
    },
    {
      role: "user",
      content: `📜 Histórico da conversa com ${nomeCliente || "cliente"}:\n${conversaFormatada}\n\n📱 Modelo demonstrado: ${modeloEscolhido?.nome || "Não identificado"}`
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

  // Envia o resumo para o número da loja/supervisor
  await sendBotMessage("22998668966", `📋 *Resumo do atendimento (${sender})*\n\n${resumoFinal}`);

  // Continua o fluxo normal com o cliente
  await sendBotMessage(sender, `Então ${nomeCliente} para quando planeja fazer sua compra?`);
};

module.exports = { rotinaDeAgendamento };
