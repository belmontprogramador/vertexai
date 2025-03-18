const { handleUserInteraction } = require("./Routine Abordagem/handleUserInteraction");
const { handleStageProgression } = require("./Routine Abordagem/handleStageProgression");
const { handleSurvey } = require("./Routine Abordagem/handleSurvey");
const { getUserMessagesBySenderId } = require("../Services/messageService");
 
const { getUserChatHistory } = require("../Services/redisService");

/**
 * 🔄 Gera a rotina de atendimento baseada nas interações do usuário
 */
const generateRoutine = async (userId, userInput) => {
    console.log(`🔍 Gerando rotina para usuário ${userId} com mensagem: ${userInput}`);

     // 🔄 Importação dinâmica para evitar dependência circular
     const { sendBotMessage } = require("../Services/sentMessage");


    // 🔍 Recupera histórico do Redis
    let chatHistory = await getUserChatHistory(userId);

    // 📌 Se o histórico no Redis estiver vazio, busca no banco de dados
    if (!chatHistory || chatHistory.length === 0) {
        console.log(`🗂️ Nenhum histórico encontrado no Redis. Buscando no banco de dados...`);
        const dbMessages = await getUserMessagesBySenderId(userId);
        chatHistory = dbMessages.map(msg => msg.content);
    }

    const historyText = chatHistory.join("\n");

    // 🔄 Determina o estágio do usuário
    let userStage = await handleStageProgression(userId, userInput, "abordagem", historyText);

    console.log("🛠️ Tipo de sendBotMessage:", typeof sendBotMessage);

    // 🚀 Chamada de `handleUserInteraction` para verificar reinício de atendimento
    const userInteractionResult = await handleUserInteraction(userId, userInput, userStage, userId, sendBotMessage);
    
    if (userInteractionResult) {
        console.log("✅ Atendimento reiniciado com sucesso. Retornando...");
        return userInteractionResult; // 🔥 Aqui retorna sem continuar o fluxo
    }

    // 🔄 Se estiver na fase de sondagem, chama `handleSurvey`
    if (userStage === "sondagem_de_orcamento") {
        return await handleSurvey(userId, userInput, userStage, sendBotMessage);
    }

     
};

module.exports = { generateRoutine };
