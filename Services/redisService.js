const Redis = require("ioredis");

const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
  db: 0,
});

/**
 * 🔄 Armazena mensagens do usuário no Redis
 */
const storeUserMessage = async (userId, message) => {
    try {
        const key = `chat_history:${userId}`;

        // 🔄 Adiciona a nova mensagem no final da lista
        await redis.rpush(key, message);

        // 🔄 Mantém apenas as últimas 50 mensagens, eliminando as mais antigas
        await redis.ltrim(key, -50, -1);

        // 📜 Log para confirmar que a mensagem foi armazenada corretamente
        const updatedHistory = await redis.lrange(key, 0, -1);
         

    } catch (error) {
        console.error(`❌ Erro ao armazenar mensagem no Redis: ${error.message}`);
    }
};

  
  

/**
 * 🔄 Define o estágio do usuário no Redis
 */
const setUserStage = async (userId, stage) => {
  try {
    await redis.set(`user_stage:${userId}`, stage);
  } catch (error) {
    console.error(`❌ Erro ao definir estágio do usuário: ${error.message}`);
  }
};

/**
 * 🔍 Obtém o estágio atual do usuário no Redis
 */
const getUserStage = async (userId) => {
  try {
    const stage = await redis.get(`user_stage:${userId}`);
    return stage || "abordagem";
  } catch (error) {
    console.error(`❌ Erro ao obter estágio do usuário: ${error.message}`);
    return "abordagem";
  }
};

/**
 * 🔍 Recupera o histórico de mensagens do usuário no Redis
 */
const getUserChatHistory = async (userId) => {
    try {
      const key = `chat_history:${userId}`;
      const history = await redis.lrange(key, 0, -1);
      
    
  
      return history.length > 0 ? history : ["Sem histórico"]; // Evita retornar array vazio
    } catch (error) {
      console.error(`❌ Erro ao recuperar histórico de mensagens: ${error.message}`);
      return ["Erro ao recuperar histórico"];
    }
  };
  

/**
 * 🔄 Define o timestamp da última interação do usuário no Redis
 */
const setLastInteraction = async (userId) => {
  try {
    const timestamp = Date.now();
    await redis.set(`last_interaction:${userId}`, timestamp);
  } catch (error) {
    console.error(`❌ Erro ao definir última interação: ${error.message}`);
  }
};

/**
 * ⏳ Obtém o timestamp da última interação do usuário
 */
const getLastInteraction = async (userId) => {
  try {
    const timestamp = await redis.get(`last_interaction:${userId}`);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    console.error(`❌ Erro ao obter última interação: ${error.message}`);
    return null;
  }
};

module.exports = {
  storeUserMessage,
  setUserStage,
  getUserStage,
  getUserChatHistory,
  setLastInteraction,
  getLastInteraction,
  redis
};
