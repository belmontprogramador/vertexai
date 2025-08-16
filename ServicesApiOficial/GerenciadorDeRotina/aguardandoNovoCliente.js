const axios = require("axios");
const { setUserStageApiOficial } = require("../../Services/redisService");
const {
  moverLeadParaExclusao
} = require("../ServiceKommoApi/moverLeadsParaExclusao");
const { sendBotMessage } = require("../../Services/messageSender");

const aguardandoNovoCliente = async (sender) => {
  try {
    await setUserStageApiOficial(sender, "aguardando_novo_cliente");

    // 🟢 Mover lead para o estágio de exclusão
    await moverLeadParaExclusao(sender);

    const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: sender,
      type: "text",
      text: {
        body:
          "Oi, tudo bem? 😊\n" +
          "Esse número aqui está passando por *instabilidade*.\n\n" +
          "📲 Tem como me chamar nesse contato aqui?\n" +
          "*+55 22 99243-8160*",
      },
    };

    const headers = {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    };

    const { data } = await axios.post(url, payload, { headers });
    console.log("📨 Mensagem enviada para novo cliente:", sender);
    // await sendBotMessage("5521983735922", " Ola Anna por aqui passando para avisar que um novo cliente entrou em contato.\n Voce pode encontrar mais informações sobre ele no pipeline *COMERCIAL VERTEX* no estagio de  *LEADS PARA EXCLUSÃO* Aproveitando que vai passar por la ja exclua em massa todos ledas desse estagio isso ajuda a manar nosso CRM limpo e organizado")
    await sendBotMessage("5522998668966", " Ola Anna por aqui passando para avisar que um  novo cliente entrou em contato.\n Voce pode encontrar mais informações sobre ele no pipeline *COMERCIAL VERTEX* no estagio de  *LEADS PARA EXCLUSÃO* Aproveitando que vai passar por la ja exclua em massa todos ledas desse estagio isso ajuda a manar nosso CRM limpo e organizado")
    await sendBotMessage("5522988319544", " Ola Anna por aqui passando para avisar que um novo cliente entrou em contato.\n Voce pode encontrar mais informações sobre ele no pipeline *COMERCIAL VERTEX* no estagio de  *LEADS PARA EXCLUSÃO* Aproveitando que vai passar por la ja exclua em massa todos ledas desse estagio isso ajuda a manar nosso CRM limpo e organizado")

    return data;
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem para novo cliente:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = { aguardandoNovoCliente };
