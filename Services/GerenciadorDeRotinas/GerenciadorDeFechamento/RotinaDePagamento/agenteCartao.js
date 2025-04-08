const { sendBotMessage } = require("../../../messageSender");
const OpenAI = require("openai");
const { setUserStage } = require("../../../redisService");
const { rotinaDeEntrega } = require("../../GerenciadorDeEntrega/rotinaDeEntrega");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const agenteCartao = async ({ sender, msgContent, pushName }) => {
  try {
    // Define o stage
    await setUserStage(sender, "pagamento_cartao");

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `
Você é um especialista da VertexStore em pagamentos com cartão de crédito.

1. Explique de forma clara que o pagamento pode ser feito à vista ou parcelado em até 10x.
2. Após a explicação, pergunte se o cliente quer tirar mais dúvidas ou seguir para a entrega.
3. Seja simpático, breve e profissional.
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

    const resposta = completion.choices[0].message.content || "Posso te ajudar com mais alguma coisa?";
    const msgLower = msgContent.toLowerCase();

    // Verifica se o cliente quer seguir
    const desejaSeguir = [
      "seguir", "entrega", "pode seguir", "quero seguir", "vamos para entrega", "fechar", "finalizar", "prosseguir", "está certo"
    ].some(frase => msgLower.includes(frase));

    if (desejaSeguir) {
      await sendBotMessage(sender, `📦 Perfeito, ${pushName}! Vamos continuar com a entrega.`);
      await setUserStage(sender, "entrega");
      return await rotinaDeEntrega({ sender, msgContent, pushName });
    }

    // Caso não queira seguir, envia apenas a resposta
    return await sendBotMessage(sender, resposta);
  } catch (err) {
    console.error("❌ Erro no agenteCartao:", err);
    await sendBotMessage(sender, "❌ Tive um problema para continuar. Pode tentar novamente?");
  }
};

module.exports = { agenteCartao };
