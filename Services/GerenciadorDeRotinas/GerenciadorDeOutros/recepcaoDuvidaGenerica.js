// Importa funções necessárias 
const {  setUserStage, getNomeUsuario } = require("../../redisService"); 
const { sendBotMessage } = require("../../messageSender"); 

// Função que captura a dúvida do usuário e envia para um atendente humano
const recepcaoDuvidaGenerica = async ({ sender, msgContent, pushName}) => {
  try {     
    
    // Opcional: Define o stage do usuário, se necessário (ex: aguardando resposta humana)
    await setUserStage(sender, "captura_de_duvida");

    const nome = await getNomeUsuario(sender)
     
    
    // Retorna uma mensagem de confirmação ou instrução para o usuário
    return await sendBotMessage(sender, `Oi ${nome}, me fala qual a sua duvida para eu te ajudar`);
  } catch (error) {
    console.error("Erro ao capturar a dúvida geral:", error);
    return await sendBotMessage(sender, "Houve um erro ao encaminhar sua dúvida. Por favor, tente novamente mais tarde.");
  }
};

module.exports = { recepcaoDuvidaGenerica };
