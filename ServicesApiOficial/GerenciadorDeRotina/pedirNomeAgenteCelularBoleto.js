const axios = require("axios");
const { setUserStageApiOficial } = require("../../Services/redisService");

const enviarMensagemWhatsApp = async (sender, body) => {
  const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: sender,
    type: "text",
    text: { body },
  };

  const headers = {
    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    "Content-Type": "application/json",
  };

  return axios.post(url, payload, { headers });
};

const pedirNomeAgenteCelularBoleto = async (sender) => {
  await setUserStageApiOficial(sender, "captura_nome_celular_boleto");

  const body =
    "Antes de continuar, me diz uma coisa:\n\n*Qual é o seu nome?* 😄";

  return await enviarMensagemWhatsApp(sender, body);
};

module.exports = { pedirNomeAgenteCelularBoleto };
