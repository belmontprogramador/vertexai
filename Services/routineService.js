const OpenAI = require("openai");
const { 
  storeUserMessage, 
  getUserStage, 
  getUserChatHistory 
} = require("./redisService");
const { 
    validateStageProgression, // ✅ Use esta função em vez de `correctUserStage`
    getStageFromUserInput 
  } = require("./salesStages");
  

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CONVERSION_PROMPT = `
Você é Anna, uma vendedora especializada em vendas e atendimento ao cliente da Vertex Store.
Sua função é transformar um contexto inicial em uma rotina programática de atendimento para um processo de vendas.

**Instruções:**
1️⃣ **Analise o contexto recebido** e determine em qual estágio do processo de vendas o cliente está.
2️⃣ **Se o cliente pulou etapas, ajuste-o para o estágio correto** antes de avançar.
3️⃣ **Se o cliente voltou a uma dúvida anterior, retroceda o estágio conforme necessário**.
4️⃣ **Divida as etapas em ações numeradas e subações identificadas por letras**.
5️⃣ **Use a lógica 'IF... THEN'** para guiar a conversa de maneira estruturada.
6️⃣ **Sempre peça informações necessárias ao usuário** antes de avançar para a próxima etapa.
7️⃣ **Sempre armazene as interações do usuário no Redis** para manter um histórico.
8️⃣ **Atualize o estágio do usuário no Redis ao final de cada etapa relevante**.
9️⃣ **A última ação sempre deve ser perguntar se há algo mais com que pode ajudar**.
10️⃣ **Se não houver contexto suficiente, peça mais informações ao usuário**.

Agora gere a rotina com base no seguinte contexto:
`;

/**
 * 🔄 Gera a rotina de atendimento com base no contexto e executa ações do Redis
 * @param {string} userId - ID do usuário
 * @param {string} userInput - Mensagem do usuário
 * @returns {Promise<string>} - Retorna a resposta da rotina gerada
 */

const generateRoutine = async (userId, userInput) => {
    try {
        console.log(`🔍 Gerando rotina para usuário ${userId} com mensagem: ${userInput}`);

        // 📌 Obtém o estágio do usuário no Redis
        let userStage = await getUserStage(userId);
        console.log(`📌 O usuário ${userId} está no estágio: ${userStage}`);

        // 🔄 Determina o estágio correto com base na entrada do usuário
        const detectedStage = getStageFromUserInput(userInput, userStage);

       // 🔄 Ajusta o estágio se o usuário tiver avançado ou retrocedido de forma errada
if (detectedStage !== userStage) {
    userStage = await validateStageProgression(userId, detectedStage, userStage); // ✅ Corrigido
}


        const chatHistory = await getUserChatHistory(userId);
        
        const messages = [
            {
                role: "assistant",
                content: `${CONVERSION_PROMPT}\nUsuário está no estágio: ${userStage || "abordagem"}.\nHistórico de mensagens: ${chatHistory?.join(", ") || "Sem histórico"}.\nContexto: ${userInput}`
            }
        ];

        console.log("📡 Enviando requisição ao OpenAI...");
        const response = await openai.chat.completions.create({
            model: "gpt-4-1106-preview", // 🔄 Agora usando gpt-4-1106-preview
            messages,
            max_tokens: 3000,
        });

        console.log("✅ Resposta bruta da OpenAI recebida.");

        if (!response.choices || response.choices.length === 0 || !response.choices[0].message) {
            throw new Error("❌ Resposta vazia da OpenAI.");
        }

        const routine = response.choices[0].message.content.trim();
        console.log("📜 Conteúdo da rotina gerada:", JSON.stringify(routine, null, 2));

        // 🔄 Armazena a rotina no histórico do Redis
        await storeUserMessage(userId, `Anna (Rotina): ${routine}`);

        // ✅ Agora gera a resposta com base na rotina
        console.log("📡 Gerando resposta baseada na rotina...");
        const responseMessages = [
            {
                role: "assistant",
                content: `Com base na rotina abaixo, gere uma resposta clara e direta para o usuário:\n\n${routine}`
            }
        ];

        const responseAI = await openai.chat.completions.create({
            model: "gpt-4-1106-preview", // 🔄 Agora usando gpt-4-1106-preview
            messages: responseMessages,
            max_tokens: 1000,
        });

        if (!responseAI.choices || responseAI.choices.length === 0 || !responseAI.choices[0].message) {
            throw new Error("❌ Falha ao gerar a resposta final.");
        }

        const finalResponse = responseAI.choices[0].message.content.trim();
        console.log("💬 Resposta gerada para o usuário:", finalResponse);

        // 🔄 Armazena a resposta gerada no histórico do Redis
        await storeUserMessage(userId, `Anna: ${finalResponse}`);

        return { routine, response: finalResponse };
    } catch (error) {
        console.error(`❌ Erro ao gerar rotina e resposta: ${error.message}`);
        return { routine: "Erro ao gerar a rotina de atendimento.", response: "Erro ao gerar a resposta ao usuário." };
    }
};

module.exports = { generateRoutine };