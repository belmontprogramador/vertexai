const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_ API_KEY });

 
/**
 * 📌 Gera uma mensagem de acompanhamento para engajar o cliente na conversa
 */
const generateFollowUpMessage = async (chatHistory, userStage) => {
    const userContext = `
    O cliente já interagiu anteriormente. Aqui está o histórico:
    ${chatHistory || "Nenhuma interação registrada."}
    
    Ele está atualmente na etapa de venda: ${userStage}.
    
    Gere uma resposta natural e envolvente que mantenha a conversa fluindo de forma amigável e persuasiva.
    Incentive o cliente a continuar interagindo.
    `;

    return await callOpenAi(userContext, 300);
};  

/**
 * 🔥 Gera uma mensagem de fechamento para incentivar a conversão
 */
const generateClosingMessage = async (chatHistory) => {
    const userContext = `
    O cliente já demonstrou interesse nos produtos oferecidos.
    Aqui está o histórico de interação até o momento:
    ${chatHistory || "Nenhuma interação registrada."}

    Gere uma mensagem persuasiva que encoraje o cliente a tomar uma decisão de compra.
    Utilize um tom amigável e motivador, oferecendo um benefício adicional para incentivá-lo a finalizar a compra.
    `;

    return await callOpenAi(userContext, 300);
};

/**
 * 🎯 Chamada centralizada à OpenAI para evitar repetição de código
 */
const callOpenAi = async (userContext, maxTokens) => {
    console.log("📡 Enviando requisição à OpenAI...");
    try {
        const aiResponse = await openai.chat.completions.create({
            model: "gpt-4-1106-preview",
            messages: [{ role: "system", content: userContext }],
            max_tokens: maxTokens,
        });

        if (!aiResponse.choices || aiResponse.choices.length === 0 || !aiResponse.choices[0].message) {
            console.error("❌ Erro ao obter resposta da OpenAI.");
            return "Desculpe, houve um problema ao processar sua solicitação.";
        }

        return aiResponse.choices[0].message.content.trim();
    } catch (error) {
        console.error("❌ Erro na requisição OpenAI:", error.message);
        return "Erro ao gerar a resposta.";
    }
};

module.exports = {    
    generateFollowUpMessage,  
    generateClosingMessage,
};
