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
    await redis.ltrim(key, -150, -1);

    // 📜 Log para confirmar que a mensagem foi armazenada corretamente
    const updatedHistory = await redis.lrange(key, 0, -1);


  } catch (error) {
    console.error(`❌ Erro ao armazenar mensagem no Redis: ${error.message}`);
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
 * ❌ Remove o histórico de mensagens do usuário no Redis
 */
const deleteUserChatHistory = async (userId) => {
  try {
    const key = `chat_history:${userId}`;
    await redis.del(key);
    console.log(`✅ Histórico de mensagens do usuário ${userId} removido com sucesso.`);
  } catch (error) {
    console.error(`❌ Erro ao remover histórico de mensagens do usuário: ${error.message}`);
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
    return stage;
  } catch (error) {
    console.error(`❌ Erro ao obter estágio do usuário: ${error.message}`);
    return "abordagem";
  }
};

/**
 * ❌ Remove o estágio do usuário no Redis
 */
const deleteUserStage = async (userId) => {
  try {
    const key = `user_stage:${userId}`;
    await redis.del(key);
    console.log(`✅ Estágio do usuário ${userId} removido com sucesso.`);
  } catch (error) {
    console.error(`❌ Erro ao remover estágio do usuário: ${error.message}`);
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

/**
 * ❌ Remove a última interação do usuário no Redis
 */
const deleteLastInteraction = async (userId) => {
  try {
    const key = `last_interaction:${userId}`;
    await redis.del(key);
    console.log(`✅ Última interação do usuário ${userId} removida com sucesso.`);
  } catch (error) {
    console.error(`❌ Erro ao remover última interação do usuário: ${error.message}`);
  }
};


/**
 * 🔄 Armazena uma resposta específica do usuário em um hash no Redis, separando por rotina
 */
const storeUserResponse = async (userId, routine = "default", key, response) => {
  try {
    const redisKey = `user_responses:${routine}:${userId}`;
    const timestamp = Date.now();

    await redis.hset(redisKey, key, response);
    await redis.hset(redisKey, `${key}_timestamp`, timestamp); // grava o timestamp junto

    console.log(`💾 [DEBUG] Resposta salva: "${key}" = "${response}" com timestamp ${timestamp}`);
  } catch (error) {
    console.error(`❌ Erro ao armazenar resposta do usuário na rotina ${routine}: ${error.message}`);
  }
};


/**
 * 🔍 Obtém todas as respostas armazenadas do usuário em uma rotina específica no Redis
 */
const getUserResponses = async (userId, routine = "default") => {
  try {
    const redisKey = `user_responses:${routine}:${userId}`;
    console.log(`🔍 [DEBUG] Buscando respostas do usuário no Redis - Chave: ${redisKey}`);
    
    const responses = await redis.hgetall(redisKey);

    console.log(`📩 [DEBUG] Respostas encontradas para ${userId}:`, responses);

    return responses || {};
  } catch (error) {
    console.error(`❌ Erro ao recuperar respostas do usuário na rotina ${routine}: ${error.message}`);
    return {};
  }
};


/**
 * ❌ Remove todas as respostas do usuário de uma rotina específica
 */
const deleteUserResponses = async (userId, routine = "default") => {
  const redisKey = `user_responses:${routine}:${userId}`;
  await redis.del(redisKey);
};



 


module.exports = {
  storeUserResponse,
  getUserResponses,
  setUserStage,
  getUserStage,
  deleteUserStage,
  storeUserMessage,
  getUserChatHistory,
  deleteUserChatHistory,
  setLastInteraction,
  getLastInteraction,
  deleteLastInteraction,  
  getUserResponses,
  deleteUserResponses,
  
  redis
};








