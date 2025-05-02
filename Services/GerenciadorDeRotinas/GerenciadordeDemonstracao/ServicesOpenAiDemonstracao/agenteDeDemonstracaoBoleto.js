const { sendBotMessage } = require("../../../messageSender");
const { setUserStage, storeSelectedModel, getChosenModel } = require("../../../redisService");

// Lista fixa de modelos disponíveis via boleto
const modelosBoleto = [
  {
    nome: "XIAOMI NOTE 14",
    nfc: false,
    entrada: "300,00",
    parcela: "150,00"
  },
  {
    nome: "REALME C61",
    nfc: true,
    entrada: "199,00",
    parcela: "145,00"
  },
  {
    nome: "NOTE 60",
    nfc: false,
    entrada: "150,00",
    parcela: "100,00"
  },
  {
    nome: "REALME C75",
    nfc: true,
    entrada: "288,00",
    parcela: "174,00"
  }
];

const agenteDeDemonstracaoBoleto = async ({ sender, modelo, pushName }) => {
  if (!modelo) {
    await sendBotMessage(sender, "❌ Não consegui identificar o modelo. Pode repetir?");
    return;
  }

  const modeloEncontrado = modelosBoleto.find(m => m.nome.toLowerCase() === modelo.toLowerCase());

  if (!modeloEncontrado) {
    await sendBotMessage(sender, "❌ Modelo não encontrado na lista de boletos. Pode verificar novamente?");
    return;
  }

  await storeSelectedModel(sender, modeloEncontrado.nome);

  const mensagem = `
🔥 *${modeloEncontrado.nome} – Oportunidade Especial!* 🔥
_Confira uma oportunidade incrível para conquistar seu novo celular!_

• *NFC:* ${modeloEncontrado.nfc ? "Possui NFC para pagamentos por aproximação" : "Não possui NFC"}
• *Entrada:* a partir de *R$ ${modeloEncontrado.entrada}*
• *Parcelas:* a partir de *R$ ${modeloEncontrado.parcela}*

💬 Lembrando que esses valores são apenas estimativas e podem variar conforme a análise da PayJoy.

_Vertex Store: conectando você ao mundo e aproximando quem você ama! 💜_

vc é capaz de responder todas as perguntas sobre o financiamento da payjoy no financiamento por boleto alem de responder duvidas sobre o aparelho
`;

  await sendBotMessage(sender, mensagem);

  await sendBotMessage(sender, "📣 Você gostaria de saber mais informações desse modelo ou já agendar uma visita para garantir o seu?");

  await setUserStage(sender, "aguardando_decisao_pos_demo");
};

module.exports = { agenteDeDemonstracaoBoleto };
