const { getUserChatHistory, setUserStage, setLastInteraction } = require("../../Services/redisService");
const redis = require("../../Services/redisService").redis;
const { generateProductRecommendation } = require("../../Services/openAiService");

const handleSurvey = async (userId, userInput, pushName, sendMessageFunction) => {
    let surveyStep = await redis.get(`survey_step:${userId}`);
    surveyStep = surveyStep ? parseInt(surveyStep, 10) : 0;

    console.log(`🛠️ [handleSurvey] Usuário: ${userId}, Etapa Atual: ${surveyStep}, Resposta: ${userInput}`);

    // 🔄 Se for a primeira vez chamando a função, iniciar com saudação e mover usuário para "sondagem_de_orcamento"
    if (surveyStep === 0 && !userInput) {
        console.log(`📨 Enviando saudação para ${userId}...`);
        await sendMessageFunction(userId, `Oi ${pushName}! Anna do time VERTEX aqui 🙋🏻‍♀️. Vou te ajudar no seu atendimento!`);

        // Move usuário para o estágio de sondagem
        await setUserStage(userId, "sondagem_de_orcamento");

        setTimeout(async () => {
            console.log(`📨 Enviando primeira pergunta para ${userId}...`);
            await sendMessageFunction(userId, "💬 Oi! 😊 Me conta, como posso te ajudar hoje? Qual produto você está procurando?");
            await redis.set(`survey_step:${userId}`, 1);
        }, 1000);

        return;
    }

    // 🔄 Armazena a resposta do usuário antes de avançar
    await redis.set(`survey_response_${surveyStep}:${userId}`, userInput);
    console.log(`✅ Resposta armazenada para survey_step ${surveyStep}: ${userInput}`);

    // 🚀 Controle de etapas individuais
    switch (surveyStep) {
        case 1:
            await redis.set(`survey_step:${userId}`, 2);
            await setLastInteraction(userId);
            await sendMessageFunction(userId, "💬 Que bacana! 🎉 Com certeza vamos encontrar algo perfeito! Mas me conta, qual a necessidade e a utilidade que você busca nesse produto?");
            return;

        case 2:
            await redis.set(`survey_step:${userId}`, 3);
            await setLastInteraction(userId);
            await sendMessageFunction(userId, "💬 Ótimo! Saquei bem sua necessidade! Me conta, já tem alguma ideia do valor que você gostaria de investir?");
            return;

        case 3:
            await setUserStage(userId, "demonstracao_do_produto");
            await setLastInteraction(userId);

            const produtoDesejado = await redis.get(`survey_response_1:${userId}`) || "produto não informado";
            const necessidade = await redis.get(`survey_response_2:${userId}`) || "necessidade não informada";
            const investimento = await redis.get(`survey_response_3:${userId}`) || "orçamento não informado";

            const chatHistory = await getUserChatHistory(userId);
            const recommendation = await generateProductRecommendation(produtoDesejado, necessidade, investimento, chatHistory);

            await sendMessageFunction(userId, `📢 Então ${pushName}! ${recommendation}`);
            return;

        default:
            console.error(`❌ [handleSurvey] Etapa desconhecida: ${surveyStep}`);
            await sendMessageFunction(userId, "❌ Ocorreu um erro no fluxo da sondagem. Vamos tentar novamente.");
            await redis.set(`survey_step:${userId}`, 1);
            return;
    }
};

module.exports = { handleSurvey };
