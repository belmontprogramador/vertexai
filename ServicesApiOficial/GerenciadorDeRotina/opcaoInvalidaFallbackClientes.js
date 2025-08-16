const axios = require("axios");
const { checagemInicialApi } = require("../checagemInicialApi");
const { setUserStageApiOficial } = require("../../Services/redisService");

const opcaoInvalidaFallbackCliente = async (sender, msgContent, pushName, messageId, quotedMessage) => {
  try {
    await setUserStageApiOficial(sender, "menu_cliente_existente");

    const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      to: sender,
      type: "text",
      text: {
        body:
          "Sou uma automação 🤖 e preciso da sua colaboração para te encaminhar ao atendimento humano.\n\n" +
          "Já entendi que você é nosso cliente. Aguarde só um momento que nosso atendente vai te chamar. 👩‍💻",
      },
    };
    const headers = {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    };

    await axios.post(url, payload, { headers });
    await checagemInicialApi(sender, msgContent, pushName, messageId, quotedMessage);
  } catch (error) {
    console.error("❌ Erro em opcaoInvalidaFallbackCliente:", error.response?.data || error.message);
  }
};

module.exports = { opcaoInvalidaFallbackCliente };
