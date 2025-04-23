const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  storeSelectedModel,
  getChosenModel
} = require("../../../redisService");
const { buscarProdutosPorCategoria } = require("../../../ServiceBling/blingProductByCategoryService");
require("dotenv").config();

const formatarCelular = (cel) => `📱 *${cel.nome}* - R$${cel.preco}
_${cel.descricao}_\n`;

const agenteDeDemonstracaoPorNome = async ({ sender, msgContent, pushName }) => {
  await setUserStage(sender, "agente_de_demonstraçao_por_nome");

  const entradaOriginal = await getChosenModel(sender);
  if (!entradaOriginal) {
    return await sendBotMessage(sender, "❌ Não consegui identificar o modelo. Pode repetir o nome?");
  }

  const celulares = await buscarProdutosPorCategoria();

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