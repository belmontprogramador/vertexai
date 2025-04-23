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

const setStageHistory = async (sender, newStage) => {
  const stageAnterior1 = await redis.get(`previous_stage:${sender}`);
  if (stageAnterior1) {
    await redis.set(`previous_stage_2:${sender}`, stageAnterior1); // mais antigo
  }
  await redis.set(`previous_stage:${sender}`, newStage); // o mais recente
};

const getStageHistory = async (sender) => {
  const stage1 = await redis.get(`previous_stage:${sender}`);
  const stage2 = await redis.get(`previous_stage_2:${sender}`);
  return { stage1, stage2 };
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

// Armazena os modelos sugeridos
const storeSelectedModel = async (sender, modelList) => {
  await redis.set(`selected_models:${sender}`, modelList);
};

// Recupera os modelos sugeridos
const getSelectedModel = async (sender) => {
  return await redis.get(`selected_models:${sender}`);
};

// Exclui os modelos sugeridos
const deleteSelectedModel = async (sender) => {
  await redis.del(`selected_models:${sender}`);
};

// Salva o modelo escolhido pelo usuário
const storeChosenModel = async (sender, modelo) => {
  await redis.set(`modelo_escolhido:${sender}`, modelo);
};

// Recupera o modelo escolhido pelo usuário
const getChosenModel = async (sender) => {
  return await redis.get(`modelo_escolhido:${sender}`);
};

// Deleta o modelo escolhido, se necessário
const deleteChosenModel = async (sender) => {
  await redis.del(`modelo_escolhido:${sender}`);
};

const getHistoricoFormatadoParaPrompt = async (userId, quantidade = 3) => {
  try {
    const key = `chat_history:${userId}`;
    const mensagens = await redis.lrange(key, -quantidade, -1); // últimas N

    return mensagens.map(msg => ({
      role: "user",
      content: msg
    }));
  } catch (error) {
    console.error(`❌ Erro ao recuperar histórico formatado: ${error.message}`);
    return [{
      role: "user",
      content: "Erro ao recuperar histórico"
    }];
  }  
};

// Armazena os modelos sugeridos pela IA
const storeModelosSugeridos = async (sender, modelos) => {
  const json = JSON.stringify(modelos);
  await redis.set(`modelos_sugeridos:${sender}`, json);
};

// Recupera os modelos sugeridos
const getModelosSugeridos = async (sender) => {
  const raw = await redis.get(`modelos_sugeridos:${sender}`);
  return raw ? JSON.parse(raw) : [];
};

// Remove os modelos sugeridos
const deleteModelosSugeridos = async (sender) => {
  await redis.del(`modelos_sugeridos:${sender}`);
};

// Armazena o valor que o usuário deseja investir em um aparelho
const storeInvestimento = async (sender, valor) => {
  try {
    const redisKey = `user_investimento:${sender}`;
    await redis.set(redisKey, valor);
    console.log(`💰 Valor de investimento (${valor}) armazenado para ${sender}`);
  } catch (error) {
    console.error(`❌ Erro ao armazenar investimento: ${error.message}`);
  }
};

// Recupera o valor de investimento do usuário
const getInvestimento = async (sender) => {
  try {
    const redisKey = `user_investimento:${sender}`;
    const valor = await redis.get(redisKey);
    return valor ? parseFloat(valor) : null;
  } catch (error) {
    console.error(`❌ Erro ao recuperar investimento: ${error.message}`);
    return null;
  }
};

// Remove o valor de investimento armazenado
const deleteInvestimento = async (sender) => {
  try {
    const redisKey = `user_investimento:${sender}`;
    await redis.del(redisKey);
    console.log(`🧹 Investimento do usuário ${sender} removido.`);
  } catch (error) {
    console.error(`❌ Erro ao deletar investimento: ${error.message}`);
  }
};

// Armazena a intenção de uso do usuário
const storeIntencaoDeUso = async (sender, intencao) => {
  try {
    const redisKey = `user_intencao_uso:${sender}`;
    await redis.set(redisKey, intencao);
    console.log(`📌 Intenção de uso armazenada para ${sender}: ${intencao}`);
  } catch (error) {
    console.error(`❌ Erro ao armazenar intenção de uso: ${error.message}`);
  }
};

// Recupera a intenção de uso do usuário
const getIntencaoDeUso = async (sender) => {
  try {
    const redisKey = `user_intencao_uso:${sender}`;
    return await redis.get(redisKey);
  } catch (error) {
    console.error(`❌ Erro ao recuperar intenção de uso: ${error.message}`);
    return null;
  }
};

// Remove a intenção de uso do usuário
const deleteIntencaoDeUso = async (sender) => {
  try {
    const redisKey = `user_intencao_uso:${sender}`;
    await redis.del(redisKey);
    console.log(`🧹 Intenção de uso do usuário ${sender} removida.`);
  } catch (error) {
    console.error(`❌ Erro ao deletar intenção de uso: ${error.message}`);
  }
};

module.exports = {
  storeSelectedModel,
  getIntencaoDeUso,
  storeIntencaoDeUso,
  deleteIntencaoDeUso,
  getInvestimento,
  storeInvestimento,
  deleteInvestimento,
  getModelosSugeridos,
  storeModelosSugeridos,
  deleteModelosSugeridos,
  getSelectedModel,
  deleteSelectedModel,
  deleteChosenModel,
  storeChosenModel,
  getChosenModel,
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
  setStageHistory,
  getStageHistory, 
  getHistoricoFormatadoParaPrompt, 
  redis
};