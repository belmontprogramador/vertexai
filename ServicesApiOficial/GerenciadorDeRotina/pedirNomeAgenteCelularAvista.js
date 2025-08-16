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

const pedirNomeAgenteCelularAvista = async (sender) => {
  await setUserStageApiOficial(sender, "captura_nome_celular_avista");

  const body =
    "Legal, vamos agilizar!\n\n*Me conta seu nome pra continuar* 😄";

  return await enviarMensagemWhatsApp(sender, body);
};

module.exports = { pedirNomeAgenteCelularAvista };
