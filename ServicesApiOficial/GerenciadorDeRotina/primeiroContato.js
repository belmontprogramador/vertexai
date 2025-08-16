const axios = require("axios");
const { deleteLeadByPhone } = require("../../Services/ServicesKommo/findLeadByPhone");
const {
  getLastInteractionApiOficial,
  getUserStageApiOficial,
  setLastInteractionApiOficial,
  setUserStageApiOficial,
} = require("../../Services/redisService");

const primeiroContato = async (sender) => {
  try {
    await setUserStageApiOficial(sender, "menu_cliente_existente");

    const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: sender, // 👈 aqui é o ponto principal
      type: "text",
      text: {
        body:
          "É um prazer ter você na Vertex 💜!\n" +
          "Temos mais de *5 Mil clientes* na Região dos Lagos 🏖.\n" +
          "Estamos passando por *instabilidades em nosso WhatsApp*, por favor nos ajude.\n\n" +
          "Digite:\n" +
          "*1* - Já fiz uma compra na Vertex\n" +
          "*2* - Ainda não comprei na Vertex"
      },
    };

    const headers = {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    };

    const { data } = await axios.post(url, payload, { headers });
    console.log("✅ Mensagem automática enviada para:", sender);

    // await deleteLeadByPhone(sender); // opcional

    return data;
  } catch (error) {
    console.error("❌ Erro ao responder ou excluir lead:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = { primeiroContato };
