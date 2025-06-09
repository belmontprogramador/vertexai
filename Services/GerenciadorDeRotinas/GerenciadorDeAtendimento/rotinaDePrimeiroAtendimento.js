const { sendBotMessage } = require("../../messageSender");
const { setUserStage, getNomeUsuario } = require("../../redisService");

const rotinaDePrimeiroAtendimento = async ({ sender, msgContent, pushName }) => {  
 
  const nome = await getNomeUsuario(sender, pushName);  

  const frases = [ `Olá ${nome}! Quem fala é a Anna da Vertex Store 👋💜. Me conta: no que posso ajudar?`,
                    `E aí ${nome}! Anna da Vertex Store por aqui 👋💜. Como posso facilitar seu dia?`
  ]  

  const fraseEscolhida = frases[Math.floor(Math.random() * frases.length)];    

  const menu = `Escolha seu clique 💜👇
1️⃣ Smartphones – lançamentos e custo-benefício top 🔥
2️⃣Pagamento Fácil – Boleto Vertex até 18X 💸
 `
  
  await sendBotMessage(sender, fraseEscolhida);  
  await sendBotMessage(sender, menu);
  await setUserStage(sender, "opean_Ai_Services_Atendimento");
};

module.exports = { rotinaDePrimeiroAtendimento };
