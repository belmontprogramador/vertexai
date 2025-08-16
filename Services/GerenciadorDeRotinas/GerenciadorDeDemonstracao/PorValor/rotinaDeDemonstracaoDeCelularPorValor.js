const { setUserStage,getNomeUsuario } = require('../../../redisService');  
const { sendBotMessage } = require("../../../messageSender");    
  
const rotinaDeDemonstracaoDeCelularPorValor = async ({ sender, msgContent, pushName }) => {  
  const nome = await getNomeUsuario(sender, pushName); 
  await setUserStage(sender, "filtro_de_valor"); 

  // Envia a pergunta principal
  await sendBotMessage(sender, `Aqui na Vertex a gente sempre tenta achar o melhor custo-benefício pro cliente. 💜 `);
  return await sendBotMessage(sender, `${nome} para eu te trazer as melhores opções. Me fala quanto tá pensando em investir ou se tem algum modelo em mente que eu já te mostro umas opções certeiras.😃`);
     
  };
  
  module.exports = { rotinaDeDemonstracaoDeCelularPorValor };