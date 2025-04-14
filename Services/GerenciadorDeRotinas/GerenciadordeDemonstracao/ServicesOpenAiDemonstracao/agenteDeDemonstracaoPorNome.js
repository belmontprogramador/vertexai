const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  storeSelectedModel,
  getChosenModel
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
  { nome: "Xiaomi Poco X6 Pro", preco: 2899, descricao: "256GB, 12GB RAM, Dimensity 8300-Ultra." }
];

const formatarCelular = (cel) => `📱 *${cel.nome}* - R$${cel.preco}\n_${cel.descricao}_\n`;

const agenteDeDemonstracaoPorNome = async ({ sender, msgContent, pushName }) => {
  await setUserStage(sender, "agente_de_demonstraçao_por_nome");

  const entradaOriginal = await getChosenModel(sender);
  if (!entradaOriginal) {
    return await sendBotMessage(sender, "❌ Não consegui identificar o modelo. Pode repetir o nome?");
  }

  const modelo = celulares.find(c => entradaOriginal.toLowerCase().includes(c.nome.toLowerCase()));

  if (!modelo) {
    return await sendBotMessage(sender, "❌ Modelo não encontrado. Pode verificar o nome e tentar novamente?");
  }

  // Envia detalhes do modelo
  await sendBotMessage(sender, `📱 Você mencionou o modelo *${modelo.nome}*. Aqui estão os detalhes:`);
  await sendBotMessage(sender, formatarCelular(modelo));

  // Define próximo stage para agente de decisão
  await setUserStage(sender, "agente_de_decisao");

  // Pergunta para o usuário o que ele deseja
  await sendBotMessage(sender, "Deseja tirar dúvidas sobre esse modelo ou ver mais opções parecidas?");
};

module.exports = { agenteDeDemonstracaoPorNome };
