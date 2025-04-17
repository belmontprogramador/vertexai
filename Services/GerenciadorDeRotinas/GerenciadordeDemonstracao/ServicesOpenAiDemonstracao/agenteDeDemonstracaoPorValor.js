const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  storeSelectedModel,
  getUserResponses
} = require("../../../redisService");
require("dotenv").config();

const celulares = [
  { nome: "Samsung Galaxy A14", preco: 1299, descricao: "Tela de 6.6\", 128GB, 4GB RAM, bateria de 5000mAh." },
  { nome: "Motorola Moto E22", preco: 1149, descricao: "64GB, Câmera dupla, Tela 6.5\" HD+." },
  { nome: "Xiaomi Redmi 12C", preco: 1399, descricao: "128GB, 4GB RAM, MediaTek Helio G85." },
  { nome: "Samsung Galaxy M14 5G", preco: 1599, descricao: "5G, 128GB, 6GB RAM, bateria de 6000mAh." },
  { nome: "Motorola Moto G73 5G", preco: 1799, descricao: "256GB, 8GB RAM, Dimensity 930." },
  { nome: "Realme C55", preco: 1699, descricao: "128GB, 6GB RAM, câmera de 64MP." },
  { nome: "Samsung Galaxy A54 5G", preco: 2399, descricao: "256GB, 8GB RAM, super AMOLED 120Hz." },
  { nome: "Motorola Edge 40 Neo", preco: 2699, descricao: "256GB, 12GB RAM, pOLED 144Hz." },
  { nome: "iPhone SE (3ª geração)", preco: 3199, descricao: "64GB, chip A15 Bionic." },
  { nome: "Xiaomi Poco X6 Pro", preco: 2899, descricao: "256GB, 12GB RAM, Dimensity 8300-Ultra." },
  { nome: "Xiaomi Note 14", preco: 300, descricao: "Sem NFC. Entrada a partir de R$ 300,00. Parcelas a partir de R$ 150,00." },
  { nome: "Realme C61", preco: 199, descricao: "Com NFC. Entrada a partir de R$ 199,00. Parcelas a partir de R$ 145,00." },
  { nome: "Note 60", preco: 150, descricao: "Sem NFC. Entrada a partir de R$ 150,00. Parcelas a partir de R$ 100,00." },
  { nome: "Realme C75", preco: 288, descricao: "Com NFC. Entrada a partir de R$ 288,00. Parcelas a partir de R$ 174,00." }
];

const formatarCelular = (cel) => `📱 *${cel.nome}* - R$${cel.preco}\n_${cel.descricao}_\n`;

const agenteDeDemonstracaoPorValor = async ({ sender, pushName }) => {
  const stage = await setUserStage(sender, "identificar_modelo");
  console.log(`entrei aqui dentro ${stage}`)


  const respostas = await getUserResponses(sender, "sondagem");
  const valorBruto = respostas?.investimento;

  const numeroExtraido = typeof valorBruto === 'string'
    ? parseFloat(valorBruto.replace(/[^\d,\.]/g, '').replace(',', '.'))
    : Number(valorBruto);

  if (!numeroExtraido || isNaN(numeroExtraido)) {
    return await sendBotMessage(sender, "❌ Não consegui entender o valor que você deseja investir. Pode me informar novamente?");
  }

  const limiteInferior = numeroExtraido - 300;
  const limiteSuperior = numeroExtraido + 300;

  const modelosFiltrados = celulares.filter(cel => cel.preco >= limiteInferior && cel.preco <= limiteSuperior);

  if (modelosFiltrados.length === 0) {
    return await sendBotMessage(sender, "😕 Não encontrei nenhum modelo dentro da sua faixa de investimento. Quer tentar outro valor?");
  }

  await sendBotMessage(sender, `📊 Com base no seu investimento aproximado de *R$${numeroExtraido.toFixed(2)}*, aqui estão algumas opções:`);

  for (const modelo of modelosFiltrados) {
    await sendBotMessage(sender, formatarCelular(modelo));
  }

  await setUserStage(sender, "agente_de_demonstração_detalhado");
  await sendBotMessage(sender, "👉 Qual desses modelos qual te chamou mais atenção?");
};

module.exports = { agenteDeDemonstracaoPorValor };
