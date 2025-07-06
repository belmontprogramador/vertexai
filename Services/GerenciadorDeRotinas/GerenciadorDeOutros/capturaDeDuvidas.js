// Importa funções necessárias 
const { appendToConversation, setUserStage } = require("../../redisService"); 
const { rotinaDeOutros } = require("./rotinaDeOutros");
const { sendBotMessage } = require("../../messageSender");

// Função que captura a dúvida do usuário e envia para um atendente humano
const capturarDuvida = async ({ sender, msgContent, pushName}) => {
  try {
    // Registra a mensagem do usuário no histórico (para auditoria, log e contexto)
    await appendToConversation(sender, {
      tipo: "duvida_geral",
      conteudo: msgContent,
      timestamp: new Date().toISOString()
    });   
    
    // Opcional: Define o stage do usuário, se necessário (ex: aguardando resposta humana)
    await setUserStage(sender, "rotina_de_outros");
    
    // Notifica o atendente (humano) para que verifique a dúvida
    await rotinaDeOutros({
      sender,
      msgContent,
      pushName,      
    });
    
    // Retorna uma mensagem de confirmação ou instrução para o usuário
    return await sendBotMessage(sender, "Sua dúvida foi encaminhada para um atendente. Em instantes, você receberá uma resposta personalizada.");
  } catch (error) {
    console.error("Erro ao capturar a dúvida geral:", error);
    return await sendBotMessage(sender, "Houve um erro ao encaminhar sua dúvida. Por favor, tente novamente mais tarde.");
  }
};

module.exports = { capturarDuvida };
