const { getLastInteraction, setUserStage, setLastInteraction, getUserChatHistory } = require("../../Services/redisService");
const { getUserMessagesBySenderId, getAllUserMessages } = require("../../Services/messageService");
const { generateFollowUpMessage } = require("../../Services/openAiService");
const redis = require("../../Services/redisService").redis;
const { handleSurvey } = require("./handleSurvey");

const CHECK_TIME_LIMIT = 1 * 60 * 1000; // 5 minutos para testar melhor

const handleUserInteraction = async (userId, userInput, userStage, userPhoneNumber, sendMessageFunction) => {    
    const lastInteraction = await getLastInteraction(userId);
    const currentTime = Date.now();

    console.log(`⏳ Última interação de ${userId}: ${lastInteraction}, Agora: ${currentTime}`);

    // 🔍 Verifica se a última interação foi há mais de CHECK_TIME_LIMIT minutos
    if (lastInteraction && (currentTime - lastInteraction) > CHECK_TIME_LIMIT) {
        console.log(`⏳ Tempo limite excedido. Perguntando se deseja reiniciar...`);

        if (userInput.toLowerCase().includes("sim")) {
            console.log(`🔄 Usuário ${userId} optou por reiniciar o atendimento.`);
            
            // Retorna o usuário para a etapa de abordagem
            await setUserStage(userId, "abordagem");
            await redis.set(`survey_step:${userId}`, 0);
            await setLastInteraction(userId);

            // ✅ CHAMAR `handleSurvey` DIRETAMENTE
            console.log(`📨 Iniciando automaticamente a sondagem para ${userId}...`);
            return await handleSurvey(userId, "", "Cliente", sendMessageFunction);
        
        } else if (userInput.toLowerCase().includes("não")) {
            console.log(`🔄 Usuário ${userId} escolheu continuar de onde parou.`);

            // Mantém o usuário na etapa de sondagem
            await setUserStage(userId, "sondagem_de_orcamento");
            await setLastInteraction(userId);

            let surveyStep = await redis.get(`survey_step:${userId}`);
            surveyStep = surveyStep ? parseInt(surveyStep, 10) : 1; // Mantém a última etapa

            console.log(`📩 Retornando usuário ${userId} para a sondagem na etapa ${surveyStep}.`);
            return await handleSurvey(userId, "", "Cliente", sendMessageFunction);
        } else {
            return {
                routine: "Sessão expirada. Perguntar se deseja reiniciar.",
                response: `Parece que sua sessão foi pausada ⏸️. Quer retomar o atendimento? 🤔💬\n
                👉 Responda *SIM* para começar do zero 🔄 ou *NÃO* para continuar de onde parou!`
            };
        }
    }

    // 🔍 Verifica se o usuário está na sondagem **somente após checar o tempo da última interação**
    let surveyStep = await redis.get(`survey_step:${userId}`);
    surveyStep = surveyStep ? parseInt(surveyStep, 10) : 0;

    if (surveyStep > 0) {
        console.log(`🔄 Usuário ${userId} está na sondagem (Etapa ${surveyStep}). Enviando para handleSurvey...`);
        return await handleSurvey(userId, userInput, "Cliente", sendMessageFunction);
    }

    // 🔍 Tenta buscar o histórico do Redis primeiro
    let chatHistory = await getUserChatHistory(userId);

    // 📌 Se o histórico no Redis estiver vazio, busca no banco de dados pelo telefone do usuário
    if (!chatHistory || chatHistory.length === 0) {
        console.log(`🗂️ Nenhum histórico encontrado no Redis. Buscando no banco de dados...`);
        const dbMessages = await getUserMessagesBySenderId(userPhoneNumber, 5);
        chatHistory = dbMessages.map(msg => msg.conversation);
    }

    return null;
};

module.exports = { handleUserInteraction };
