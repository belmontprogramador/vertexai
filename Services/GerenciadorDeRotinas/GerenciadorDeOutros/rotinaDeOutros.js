const { sendBotMessage } = require('../../messageSender');
const { setUserStage, getNomeUsuario, getConversation } = require('../../redisService');

const rotinaDeOutros = async ({ sender, msgContent, pushName }) => {
  await setUserStage(sender, "rotina_de_outros");

  // 🔍 Busca a última dúvida geral do histórico
  const conversa = await getConversation(sender);
  const ultimaDuvida = [...conversa].reverse().find(m => m.tipo === "duvida_geral");
  const conteudoDuvida = ultimaDuvida?.conteudo || "Dúvida não encontrada.";

  const resumoFinal = `📩 "${conteudoDuvida}"`;

  const atendentes = [
    "5521983735922",
    "5522992484280",
    "5522988319544",
    "5522999018533",
    "5522998668966"
  ];

  const nome = await getNomeUsuario(sender)

  for (const numero of atendentes) {
    await sendBotMessage(numero, `📋 *O cliente ${nome}, com o numero (${sender})*\nEnviou essa duvida ou esta buscando por este acessorio\n\n*${resumoFinal}*`);
  }
  
};

module.exports = { rotinaDeOutros };
