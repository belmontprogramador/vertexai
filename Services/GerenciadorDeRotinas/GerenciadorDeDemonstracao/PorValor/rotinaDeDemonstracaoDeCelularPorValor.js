const { setUserStage,getNomeUsuario } = require('../../../redisService');  
const { sendBotMessage } = require("../../../messageSender");    
  
const rotinaDeDemonstracaoDeCelularPorValor = async ({ sender, msgContent, pushName }) => {  
  const nome = await getNomeUsuario(sender, pushName); 
  await setUserStage(sender, "filtro_de_valor"); 

  // Envia a pergunta principal
  await sendBotMessage(sender, `Na Vertex Store, sempre temos a solução exata para o que você precisa. 💜 `);
  return await sendBotMessage(sender, `${nome} para eu te trazer as melhores opções,  me diz quanto quer investir no aparelho. 😃`);
     
  };
  
  module.exports = { rotinaDeDemonstracaoDeCelularPorValor };