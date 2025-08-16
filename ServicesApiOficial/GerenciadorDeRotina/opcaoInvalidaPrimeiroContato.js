const axios = require("axios");
const { setUserStageApiOficial } = require("../../Services/redisService");
const { checagemInicialApi } = require("../checagemInicialApi");

const opcaoInvalidaPrimeiroContato = async (sender, msgContent, pushName, messageId, quotedMessage) => {
  try {
    await setUserStageApiOficial(sender, "primeiro_contato_api_oficial");

    const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      to: sender,
      type: "text",
      text: {
        body: "Desculpe, não entendi 😅\n\nSou uma automação da nossa equipe e preciso da sua ajuda para seguir com o atendimento.\n\nPor favor, digite:\n*1* para cliente existente\n*2* para novo cliente\n\nAssim consigo te direcionar direitinho! 😉"
      },
    };
    const headers = {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    };

    await axios.post(url, payload, { headers });

    // Reinicia fluxo
    await checagemInicialApi(sender, msgContent, pushName, messageId, quotedMessage);
  } catch (error) {
    console.error("❌ Erro em opcaoInvalidaPrimeiroContato:", error.response?.data || error.message);
  }
};

module.exports = { opcaoInvalidaPrimeiroContato };
