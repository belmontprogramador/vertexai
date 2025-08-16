const axios = require("axios");
const { setUserStageApiOficial } = require("../../Services/redisService");

const opcaoInvalidaFormaPagamento = async (sender) => {
  try {
    // Reinicia o stage
    await setUserStageApiOficial(sender, "aguardando_forma_pagamento");

    const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: sender,
      type: "text",
      text: {
        body:
          "🚫 Ops! A resposta não foi reconhecida.\n\n" +
          "👋 Esse atendimento é feito por uma *automação*, então preciso que você escolha uma das opções corretamente:\n\n" +
          "💳 *X* - À vista (PIX ou cartão)\n" +
          "🧾 *Y* - No boleto\n\n" +
          "Me responde com *X* ou *Y*, por favor 🙏",
      },
    };

    const headers = {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    };

    const { data } = await axios.post(url, payload, { headers });
    console.log("📨 Fallback da forma de pagamento enviado para:", sender);
    return data;
  } catch (error) {
    console.error("❌ Erro ao enviar fallback de forma de pagamento:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = { opcaoInvalidaFormaPagamento };
