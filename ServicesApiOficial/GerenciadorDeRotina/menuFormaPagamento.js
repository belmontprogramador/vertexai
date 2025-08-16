const axios = require("axios");
const { setUserStageApiOficial, getUserStageApiOficial } = require("../../Services/redisService");

const menuFormaPagamento = async (sender) => {
  try {
     await setUserStageApiOficial(sender, "aguardando_forma_pagamento");
     const stage = await getUserStageApiOficial(sender)

    const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: sender,
      type: "text",
      text: {
        body:
  "Só pra te ajudar da melhor forma, me conta como foi a forma de pagamento da sua compra:\n\n" +
  "💳 *X* - À vista (PIX ou cartão)\n" +
  "🧾 *Y* - No boleto\n"            
      },
    };

    const headers = {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    };

    const { data } = await axios.post(url, payload, { headers });
    console.log("📨 Menu de forma de pagamento enviado para:", sender);
    return data;
  } catch (error) {
    console.error("❌ Erro ao enviar menu de forma de pagamento:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = { menuFormaPagamento };
