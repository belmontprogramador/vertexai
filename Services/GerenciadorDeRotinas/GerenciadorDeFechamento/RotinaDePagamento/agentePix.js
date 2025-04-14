const { sendBotMessage } = require("../../../messageSender");
const OpenAI = require("openai");
const { setUserStage } = require("../../../redisService");
const { rotinaDeEntrega } = require("../RotinaDeEntrega/rotinaDeEntrega");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const agentePix = async ({ sender, msgContent, pushName }) => {
  try {
    await setUserStage(sender, "pagamento_pix");

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `
Você é um especialista em pagamentos via Pix.

1. Explique como funciona o Pix: pagamento instantâneo por QR Code ou chave Pix.
2. Informe que é rápido e seguro.
3. Pergunte se o cliente quer tirar dúvidas ou seguir para a entrega.
4. Seja breve, simpático e direto.
        `
        },
        {
          role: "user",
          content: msgContent
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    const resposta = completion.choices[0].message.content || "Posso te ajudar com mais alguma dúvida sobre o Pix?";
    const msgLower = msgContent.toLowerCase();

    // Detecta se o cliente quer seguir para entrega
    const desejaSeguir = [
      "seguir", "entrega", "pode seguir", "quero seguir", "vamos para entrega", "fechar", "finalizar", "prosseguir", "tá certo"
    ].some(f => msgLower.includes(f));

    if (desejaSeguir) {
      await sendBotMessage(sender, `📦 Perfeito, ${pushName}! Vamos seguir com a entrega.`);
      await setUserStage(sender, "entrega");
      return await rotinaDeEntrega({ sender, msgContent, pushName });
    }

    return await sendBotMessage(sender, resposta);
  } catch (err) {
    console.error("❌ Erro no agentePix:", err);
    await sendBotMessage(sender, "❌ Tive um problema para continuar. Pode tentar novamente?");
  }
};

module.exports = { agentePix };
