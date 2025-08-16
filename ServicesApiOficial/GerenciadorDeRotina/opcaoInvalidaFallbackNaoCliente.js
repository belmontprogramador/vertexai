const axios = require("axios");
const { checagemInicialApi } = require("../checagemInicialApi");
const { setUserStageApiOficial } = require("../../Services/redisService");

const opcaoInvalidaFallbackNaoCliente = async (sender, msgContent, pushName, messageId, quotedMessage) => {
  try {
    await setUserStageApiOficial(sender, "aguardando_novo_cliente");

    const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      to: sender,
      type: "text",
      text: {
        body:
        "Oi, tudo bem? 😊\nEsse número está passando por instabilidade no momento.\n\n📲 Pode me chamar nesse contato aqui, por favor?\n+55 22 99914-5893",      
      },
    };
    const headers = {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    };

    await axios.post(url, payload, { headers });
    await checagemInicialApi(sender, msgContent, pushName, messageId, quotedMessage);
  } catch (error) {
    console.error("❌ Erro em opcaoInvalidaFallbackNaoCliente:", error.response?.data || error.message);
  }
};

module.exports = { opcaoInvalidaFallbackNaoCliente };
