const axios = require("axios");
const { setUserStageApiOficial } = require("../../Services/redisService");

const menuClienteExistente = async (sender) => {
  try {
    await setUserStageApiOficial(sender, "aguardando_segmento_cliente");

    const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: sender,
      type: "text",
      text: {
        body:
          "Legal! 😄\nMe diz como podemos te ajudar:\n\n" +
          "📦 *A* - Comprei um *acessório*\n" +
          "📱 *B* - Comprei um *celular*\n" +
          "🛠️ *C* - Preciso de *suporte*",
      },
    };

    const headers = {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    };

    const { data } = await axios.post(url, payload, { headers });
    console.log("📨 Menu de cliente existente enviado para:", sender);
    return data;
  } catch (error) {
    console.error("❌ Erro ao enviar menu de cliente existente:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = { menuClienteExistente };
