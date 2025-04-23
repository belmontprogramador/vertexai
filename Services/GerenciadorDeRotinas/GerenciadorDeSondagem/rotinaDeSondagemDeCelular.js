const {
  setLastInteraction,
  setUserStage,
  getUserStage,
  storeUserResponse,
  getUserResponses
} = require('../../redisService');

const { sendBotMessage } = require("../../messageSender"); 
const { pipelineContatoInicial } = require("../../ServicesKommo/pipelineContatoInicial");

const rotinaDeSondagemDeCelular = async ({ sender, msgContent, pushName }) => {

  await setUserStage(sender, "rotina_demonstração_por_valor");   

  // // Cria lead no Kommo se ainda não foi criado
  // if (!respostas?.kommo_lead_criado) {
  //   try {
  //     await pipelineContatoInicial({
  //       name: `Lead do WhatsApp - ${pushName}`,
  //       phone: `+${sender}`,
  //       firstName: pushName
  //     });
  //     await storeUserResponse(sender, "sondagem", "kommo_lead_criado", true);
  //   } catch (error) {
  //     console.error("❌ Erro ao criar lead na Kommo:", error.message);
  //   }
  // }

  // Envia a pergunta principal
  await sendBotMessage(sender, "Claro! Temos diversas opções para atender todos os tipos de necessidade 🚀 ");
  return await sendBotMessage(sender, "Só preciso te perguntar uma coisa rapidinho pra te mostrar as melhores. 💰 Quanto esta pensando em investir num novo aparelho?");
   
};

module.exports = { rotinaDeSondagemDeCelular };
