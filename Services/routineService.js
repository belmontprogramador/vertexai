const OpenAI = require("openai");
const { 
  storeUserMessage, 
  setUserStage,
  getUserStage, 
  getUserChatHistory,
  getLastInteraction,
  setLastInteraction,
} = require("./redisService");
const redis = require("./redisService").redis;

const { 
  validateStageProgression,
  getStageFromUserInput,
  STAGE_RULES
} = require("./salesStages");

const CHECK_TIME_LIMIT = 1 * 60 * 1000; // 5 minutos em milissegundos
const RESET_STAGE = "sondagem_de_orcamento"; // Estágio inicial ao reiniciar

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🚀 Definição das perguntas da sondagem
const SURVEY_QUESTIONS = [
    "Qual o produto que você procura?",
    "Qual a necessidade e utilidade que você quer com o produto?",
    "Qual o valor que está disposto a investir?"
];

/**
 * 🔄 Gera a rotina de atendimento com base no contexto e regras definidas
 */
const generateRoutine = async (userId, userInput) => {
    try {
        console.log(`🔍 Gerando rotina para usuário ${userId} com mensagem: ${userInput}`);

        // 📌 Obtém a última interação do usuário
        const lastInteraction = await getLastInteraction(userId);
        const currentTime = Date.now();

        let userStage = await getUserStage(userId);
        console.log(`📌 O usuário ${userId} está no estágio: ${userStage}`);

        // ⏳ Se a última interação foi há mais de 5 minutos, perguntar se deseja reiniciar
        if (lastInteraction && (currentTime - lastInteraction) > CHECK_TIME_LIMIT) {
            if (userInput.toLowerCase().includes("sim")) {
                console.log(`🔄 Usuário ${userId} optou por reiniciar o atendimento.`);
                
                await setUserStage(userId, RESET_STAGE);
                await redis.set(`survey_step:${userId}`, 0);
                await setLastInteraction(userId);

                await storeUserMessage(userId, "Anna: Atendimento reiniciado. Vamos começar com algumas perguntas.");
                return {
                    routine: "Atendimento reiniciado.",
                    response: SURVEY_QUESTIONS[0] // Envia a primeira pergunta
                };
            } else if (userInput.toLowerCase().includes("não")) {
                console.log(`🔄 Usuário ${userId} escolheu continuar de onde parou.`);

                // 🔍 Recupera o histórico de interações do usuário
                const chatHistory = await getUserChatHistory(userId);
                const historyText = chatHistory.join("\n");

                // 🔍 Identifica o estágio do usuário baseado nas interações
                let detectedStage = userStage;
                if (!detectedStage || detectedStage === "abordagem") {
                    detectedStage = getStageFromUserInput(historyText, "abordagem");
                    await setUserStage(userId, detectedStage);
                }

                console.log(`📌 Determinado estágio do usuário: ${detectedStage}`);

                // 📡 Gera perguntas personalizadas com base no histórico
                const userContext = `
                O cliente já interagiu anteriormente. Aqui está o histórico:
                ${historyText}
                
                Ele está atualmente na etapa de venda: ${detectedStage}.
                
                Gere uma pergunta emocional e envolvente para continuar o atendimento de forma natural. 
                A pergunta deve considerar o estágio de venda e criar conexão emocional com o cliente.
                Use um tom humanizado, amigável e persuasivo.
                `;
                
                console.log("📡 Enviando requisição à OpenAI para gerar pergunta dinâmica...");
                const aiResponse = await openai.chat.completions.create({
                    model: "gpt-4-1106-preview",
                    messages: [{ role: "system", content: userContext }],
                    max_tokens: 300,
                });

                if (!aiResponse.choices || aiResponse.choices.length === 0 || !aiResponse.choices[0].message) {
                    console.error("❌ Erro ao obter pergunta da OpenAI.");
                    return { routine: "Erro ao gerar pergunta personalizada.", response: "Desculpe, houve um problema ao continuar o atendimento." };
                }

                const finalQuestion = aiResponse.choices[0].message.content.trim();
                console.log("💬 Pergunta gerada pela OpenAI:", finalQuestion);

                await storeUserMessage(userId, `Anna: ${finalQuestion}`);
                await setLastInteraction(userId);

                return {
                    routine: `Continuando o atendimento na etapa ${detectedStage}.`,
                    response: finalQuestion
                };
            } else {
                return {
                    routine: "Sessão expirada. Perguntar se deseja reiniciar.",
                    response: "Seu atendimento foi pausado. Deseja reiniciar o atendimento? Responda 'sim' para começar do zero ou 'não' para continuar de onde parou."
                };
            }
        }

        // 🔄 Determina o estágio correto com base na entrada do usuário
        const detectedStage = getStageFromUserInput(userInput, userStage);

        if (detectedStage !== userStage) {
            userStage = await validateStageProgression(userId, detectedStage, userStage);
            await setUserStage(userId, userStage);
        }

        // 🚀 Lógica para a etapa de "Sondagem de Orçamento"
        if (userStage === "sondagem_de_orcamento") {
            let surveyStep = await redis.get(`survey_step:${userId}`);
            surveyStep = surveyStep ? parseInt(surveyStep, 10) : 0;

            // 🔄 Armazena a resposta do usuário antes de avançar
            await redis.set(`survey_response_${surveyStep}:${userId}`, userInput);
            await storeUserMessage(userId, `Usuário: ${userInput}`);

            surveyStep++; // Avança para a próxima pergunta

            if (surveyStep < SURVEY_QUESTIONS.length) {
                await redis.set(`survey_step:${userId}`, surveyStep);
                await setLastInteraction(userId);
                return { routine: `Pergunta ${surveyStep} da sondagem`, response: SURVEY_QUESTIONS[surveyStep] };
            }

            // 🚀 Se todas as perguntas foram respondidas, avança para demonstração do produto
            await setUserStage(userId, "demonstracao_do_produto");
            await setLastInteraction(userId);

            console.log("✅ Sondagem finalizada. Recuperando respostas para gerar um feedback humanizado...");

// 🔍 Recupera as respostas do usuário armazenadas no Redis
const produtoDesejado = await redis.get(`survey_response_0:${userId}`) || "produto não informado";
const necessidade = await redis.get(`survey_response_1:${userId}`) || "necessidade não informada";
const investimento = await redis.get(`survey_response_2:${userId}`) || "orçamento não informado";

// 🔍 Obtém o histórico completo do usuário para contexto adicional
const chatHistory = await getUserChatHistory(userId);
const historyText = chatHistory.join("\n");

// 📡 Prepara o contexto para a OpenAI gerar uma resposta humanizada e envolvente
const userContext = `
O cliente mencionou que está interessado no seguinte produto: ${produtoDesejado}.
Ele precisa desse produto para: ${necessidade}.
O orçamento disponível é: ${investimento}.

Aqui está o histórico de interação com o cliente:
${historyText}

Com base nesses dados:
1️⃣ Crie uma resposta envolvente e persuasiva, destacando os benefícios desse produto no dia a dia do cliente.
2️⃣ Utilize um tom amigável, humanizado e que gere conexão emocional.
3️⃣ Finalize com uma pergunta natural que incentive o cliente a continuar interagindo antes da demonstração do produto.
`;

// 📡 Chama a OpenAI para gerar a resposta personalizada
console.log("📡 Enviando requisição à OpenAI para gerar resposta personalizada...");
const aiResponse = await openai.chat.completions.create({
    model: "gpt-4-1106-preview",
    messages: [{ role: "system", content: userContext }],
    max_tokens: 500,
});

if (!aiResponse.choices || aiResponse.choices.length === 0 || !aiResponse.choices[0].message) {
    console.error("❌ Erro ao obter resposta da OpenAI.");
    return { routine: "Erro ao gerar resposta personalizada.", response: "Desculpe, houve um problema ao processar sua solicitação." };
}

const finalResponse = aiResponse.choices[0].message.content.trim();
console.log("💬 Resposta gerada pela OpenAI:", finalResponse);

// 🔄 Armazena a resposta no histórico e responde ao cliente
await storeUserMessage(userId, `Anna: ${finalResponse}`);
await setLastInteraction(userId);

// 🚀 Agora sim, avança para a demonstração do produto
await setUserStage(userId, "demonstracao_do_produto");

return {
    routine: "Sondagem finalizada. Gerando feedback humanizado e indo para demonstração do produto.",
    response: finalResponse
};
        }

        // 🔄 Obtém resposta predefinida do estágio atual
        let responseText = STAGE_RULES[userStage]?.response || "Não entendi sua solicitação. Pode reformular?";

        await storeUserMessage(userId, `Anna: ${responseText}`);
        await setLastInteraction(userId);

        return { routine: `Rotina baseada no estágio: ${userStage}`, response: responseText };

    } catch (error) {
        console.error(`❌ Erro ao gerar rotina e resposta: ${error.message}`);
        return { routine: "Erro ao gerar a rotina de atendimento.", response: "Erro ao gerar a resposta ao usuário." };
    }
};

module.exports = { generateRoutine };
