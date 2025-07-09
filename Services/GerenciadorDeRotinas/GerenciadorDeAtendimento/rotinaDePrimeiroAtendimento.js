const { sendBotMessage } = require("../../messageSender");
const { setUserStage, getNomeUsuario } = require("../../redisService");
const { pipelineContatoInicial } = require("../../ServicesKommo/pipelineContatoInicial");

const rotinaDePrimeiroAtendimento = async ({ sender, msgContent, pushName }) => {  
 
  const nome = await getNomeUsuario(sender, pushName);  

   // ✅ Executa a rotina de movimentar lead para "Contato Inicial"
   try {
    await pipelineContatoInicial({ name: nome, phone: sender });
  } catch (e) {
    console.warn("⚠️ Erro ao mover lead para Contato Inicial:", e.message);
  }

  const frases = [ `Olá ${nome}! Quem fala é a Anna da Vertex Store 👋💜. Me conta: no que posso ajudar?`,
                    `E aí ${nome}! Anna da Vertex Store por aqui 👋💜. Como posso facilitar seu dia?`
  ]  

  const fraseEscolhida = frases[Math.floor(Math.random() * frases.length)];    

  const menu = `Escolha seu clique 💜👇
1️⃣ Smartphones – lançamentos e custo-benefício top 🔥
2️⃣Pagamento Fácil – Boleto Vertex até 18X 💸
3️⃣ Outros Assuntos - Acessorios e Duvidas
 `
  
  await sendBotMessage(sender, fraseEscolhida);  
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await delay(2000); 
  await sendBotMessage(sender, menu);
  await setUserStage(sender, "opean_Ai_Services_Atendimento");
};

module.exports = { rotinaDePrimeiroAtendimento };
