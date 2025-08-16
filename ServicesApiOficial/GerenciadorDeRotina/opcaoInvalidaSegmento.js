const axios = require("axios");
const { setUserStageApiOficial } = require("../../Services/redisService");
const { checagemInicialApi } = require("../checagemInicialApi");

const opcaoInvalidaSegmento = async (sender, msgContent, pushName, messageId, quotedMessage) => {
  try {
    await setUserStageApiOficial(sender, "aguardando_segmento_cliente");

    const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      to: sender,
      type: "text",
      text: {
        body: "Ops! Não entendi 😅\n\nSou uma automação da nossa equipe e preciso da sua ajuda para te direcionar corretamente.\n\nPor favor, escolha uma das opções abaixo:\n\n*📦 A* - Acessório\n*📱 B* - Celular\n*🛠️ S* - Suporte\n\nAssim conseguimos te encaminhar para o atendente ideal. 😉"

      },
    };
    const headers = {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    };

    await axios.post(url, payload, { headers });

    await checagemInicialApi(sender, msgContent, pushName, messageId, quotedMessage);
  } catch (error) {
    console.error("❌ Erro em opcaoInvalidaSegmento:", error.response?.data || error.message);
  }
};

module.exports = { opcaoInvalidaSegmento };
