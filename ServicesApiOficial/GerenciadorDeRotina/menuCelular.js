const axios = require("axios");
const { setUserStageApiOficial, getNomeUsuarioApiOficial, pausarBotParaUsuario, retomarBotParaUsuario } = require("../../Services/redisService");
const { moverLeadParaClientesVertexBoleto } = require("../ServiceKommoApi/moverLeadParaClientesVertexBoleto");
const { moverLeadParaClientesVertexPix } = require("../ServiceKommoApi/moverLeadParaClientesVertexPix");
const { moverLeadParaClientesVertexAcessorio } = require("../ServiceKommoApi/moverLeadParaClientesVertexAcessorio");
const { moverLeadParaClientesVertexSuporte } = require("../ServiceKommoApi/moverLeadParaClientesVertexSuporte");
const { adicionarTagPipelineBoletoCliente } = require("../ServiceKommoApi/adicionarTagPipelineBoletoCliente");
const { sendBotMessage } = require("../../Services/messageSender");


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

const menuAcessorio = async (sender) => {
  try {
    await setUserStageApiOficial(sender, "menu_cliente_existente");
    await pausarBotParaUsuario(sender); // 🧠 Pausa o bot para esse cliente

console.log(`⏸️ Bot pausado individualmente para ${sender}`);

    const nome = await getNomeUsuarioApiOficial(sender);

    const body =
      `Show, ${nome || "meu parceiro"}! 😎\n` +
      "Você comprou um acessório, certo?\n\n" +
      "Sua mensagem foi registrada e em breve um atendente humano vai falar com você. 🧑‍💼";

    await enviarMensagemWhatsApp(sender, body);
    console.log("📨 Fluxo acessório iniciado para:", sender);

    // ✅ Move o lead no Kommo para Acessório
    const telefoneNumerico = sender.replace(/\D/g, "");
    await moverLeadParaClientesVertexAcessorio(telefoneNumerico);

    await sendBotMessage("5521983735922", `${nome}, ${telefoneNumerico}\n Cliente Ola Anna por aqui passando para avisar que um cliente nosso de acessorio entrou em contato.\n Voce pode encontrar mais informações sobre ele no pipeline *CLIENTE VERTEX* no estagio de  *ACESSORIOS*`)
    await sendBotMessage("5522998668966",  ` ${nome}, ${telefoneNumerico}\nOla Anna por aqui passando para avisar que um cliente nosso de acessorio entrou em contato.\n Voce pode encontrar mais informações sobre ele no pipeline *CLIENTE VERTEX* no estagio de  *ACESSORIOS*` )
    await sendBotMessage("5522988319544", ` ${nome}, ${telefoneNumerico}\nOla Anna por aqui passando para avisar que um cliente nosso de acessorio entrou em contato.\n Voce pode encontrar mais informações sobre ele no pipeline *CLIENTE VERTEX* no estagio de  *ACESSORIOS*`)
  } catch (error) {
    console.error("❌ Erro no menuAcessorio:", error.response?.data || error.message);
    throw error;
  }
};

const menuCelularBoleto = async (sender) => {
  try {
    await setUserStageApiOficial(sender, "menu_cliente_existente");
    await pausarBotParaUsuario(sender); // 🧠 Pausa o bot para esse cliente

    const nome = await getNomeUsuarioApiOficial(sender);
    const body =
      `Perfeito, ${nome || "amigo"}! 📱\n` +
      "Você comprou um celular com a gente.\n\n" +
      "Sua mensagem foi registrada e em breve um atendente humano vai falar com você. 🧑‍💼";

    await enviarMensagemWhatsApp(sender, body);
    console.log("📨 Fluxo celular iniciado para:", sender);

    // ✅ Move o lead no Kommo
    const telefoneNumerico = sender.replace(/\D/g, "");
    const leadId = await moverLeadParaClientesVertexBoleto(telefoneNumerico);

    // ✅ Adiciona tag "pipelineboletocliente"
    if (leadId) {
      await adicionarTagPipelineBoletoCliente(leadId);
    }

    await sendBotMessage("5521983735922", `${nome}, ${telefoneNumerico}\n Ola Anna por aqui passando para avisar que um cliente nosso de celular boleto entrou em contato.\n Voce pode encontrar mais informações sobre ele no pipeline *CLIENTE VERTEX* no estagio de  *CELULAR BOLETO*`)
    await sendBotMessage("5522998668966", `${nome}, ${telefoneNumerico}\n Ola Anna por aqui passando para avisar que um cliente nosso de celular boleto entrou em contato.\n Voce pode encontrar mais informações sobre ele no pipeline *CLIENTE VERTEX* no estagio de  *CELULAR BOLETO*`)
    await sendBotMessage("5522988319544", `${nome}, ${telefoneNumerico}\n Ola Anna por aqui passando para avisar que um cliente nosso de celular boleto entrou em contato.\n Voce pode encontrar mais informações sobre ele no pipeline *CLIENTE VERTEX* no estagio de  *CELULAR BOLETO*`)

  } catch (error) {
    console.error("❌ Erro no menuCelularBoleto:", error.response?.data || error.message);
    throw error;
  }
};

const menuCelularAvista = async (sender) => {
  try {
    await setUserStageApiOficial(sender, "menu_cliente_existente");
    await pausarBotParaUsuario(sender); // 🧠 Pausa o bot para esse cliente
    const nome = await getNomeUsuarioApiOficial(sender);

    const body =
      `Perfeito, ${nome || "amigo"}! 📱\n` +
      "Você comprou um celular com a gente.\n\n" +
      "Sua mensagem foi registrada e em breve um atendente humano vai falar com você. 🧑‍💼";

    await enviarMensagemWhatsApp(sender, body);
    console.log("📨 Fluxo celular iniciado para:", sender);

    // ✅ Move o lead no Kommo para Celular Pix/Cartão
    const telefoneNumerico = sender.replace(/\D/g, "");
    await moverLeadParaClientesVertexPix(telefoneNumerico);

    await sendBotMessage("5521983735922", `${nome}, ${telefoneNumerico}\nOla Anna por aqui passando para avisar que um cliente nosso de celular a vista entrou em contato.\n Voce pode encontrar mais informações sobre ele no pipeline *CLIENTE VERTEX* no estagio de  *CELULAR PIX/CARTÃO*`)
    await sendBotMessage("5522998668966", `${nome}, ${telefoneNumerico}\nOla Anna por aqui passando para avisar que um cliente nosso de celular a vista entrou em contato.\n Voce pode encontrar mais informações sobre ele no pipeline *CLIENTE VERTEX* no estagio de  *CELULAR PIX/CARTÃO*`)
    await sendBotMessage("5522988319544", `${nome}, ${telefoneNumerico}\nOla Anna por aqui passando para avisar que um cliente nosso de celular a vista entrou em contato.\n Voce pode encontrar mais informações sobre ele no pipeline *CLIENTE VERTEX* no estagio de  *CELULAR PIX/CARTÃO*`)

  } catch (error) {
    console.error("❌ Erro no menuCelularAvista:", error.response?.data || error.message);
    throw error;
  }
};

const menuSuporte = async (sender) => {
  await setUserStageApiOficial(sender, "menu_cliente_existente");
  await pausarBotParaUsuario(sender); // 🧠 Pausa o bot para esse cliente
  const nome = await getNomeUsuarioApiOficial(sender);

  const body =
    `Beleza, ${nome || "meu parceiro"}! 🛠️\n` +
    "Você precisa de suporte técnico, certo?\n\n" +
    "Sua mensagem foi registrada e em breve um atendente humano vai falar com você. 🧑‍💼";

  await enviarMensagemWhatsApp(sender, body);

  const telefoneNumerico = sender.replace(/\D/g, "");
  await moverLeadParaClientesVertexSuporte(telefoneNumerico);
  await sendBotMessage("5521983735922", `${nome}, ${telefoneNumerico}\nOla Anna por aqui passando para avisar que um cliente nosso de suporte entrou em contato.\n Voce pode encontrar mais informações sobre ele no pipeline *CLIENTE VERTEX* no estagio de  *SUPORTE*`)
    await sendBotMessage("5522998668966", `${nome}, ${telefoneNumerico}\nOla Anna por aqui passando para avisar que um cliente nosso de suporte entrou em contato.\n Voce pode encontrar mais informações sobre ele no pipeline *CLIENTE VERTEX* no estagio de  *SUPORTE*`)
    await sendBotMessage("5522988319544", `${nome}, ${telefoneNumerico}\nOla Anna por aqui passando para avisar que um cliente nosso de suporte entrou em contato.\n Voce pode encontrar mais informações sobre ele no pipeline *CLIENTE VERTEX* no estagio de  *SUPORTE*`)
};

module.exports = {
  menuAcessorio,
  menuCelularBoleto,
  menuSuporte,
  menuCelularAvista,
};
