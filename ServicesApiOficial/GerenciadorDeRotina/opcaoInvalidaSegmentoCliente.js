const axios = require("axios");
const { setUserStageApiOficial } = require("../../Services/redisService");

const opcaoInvalidaSegmentoCliente = async (sender) => {
  try {
    // 🔁 Reinicia o stage
    await setUserStageApiOficial(sender, "aguardando_segmento_cliente");

    const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: sender,
      type: "text",
      text: {
        body:
          "🚫 Ops! Não entendi sua resposta.\n\n" +
          "Por favor, responda com uma das letras abaixo para que eu possa te ajudar direitinho:\n\n" +
          "📦 *A* - Comprei um *acessório*\n" +
          "📱 *B* - Comprei um *celular*\n" +
          "🛠️ *C* - Preciso de *suporte*\n\n" +
          "Sua colaboração é essencial pra que a automação funcione bem! 😊",
      },
    };

    const headers = {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    };

    const { data } = await axios.post(url, payload, { headers });
    console.log("📨 Mensagem de opção inválida no menu segmento enviada para:", sender);
    return data;
  } catch (error) {
    console.error("❌ Erro ao enviar fallback para segmento cliente:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = { opcaoInvalidaSegmentoCliente };
