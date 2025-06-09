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
    await redis.set(`user_stage_time:${userId}`, Date.now());
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

const getHistoricoDeModelosMencionados = async (userId) => {
  const key = `user_model_history:${userId}`;
  const data = await redis.lrange(key, 0, -1);
  return data.map(item => JSON.parse(item));
};

const storeHistoricoDeModelosMencionados = async (userId, modelo) => {
  const key = `user_model_history:${userId}`;
  const payload = JSON.stringify({ modelo, timestamp: Date.now() });
  await redis.lpush(key, payload);
  await redis.ltrim(key, 0, 9); // mantém os últimos 10 registros
};

// 🔄 Armazena o nome do usuário
const storeNomeUsuario = async (sender, nome) => {
  try {
    const redisKey = `user_nome:${sender}`;
    await redis.set(redisKey, nome);
    console.log(`📝 Nome armazenado para ${sender}: ${nome}`);
  } catch (error) {
    console.error(`❌ Erro ao armazenar nome do usuário: ${error.message}`);
  }
};

// 🔍 Recupera o nome do usuário
const getNomeUsuario = async (sender) => {
  try {
    const redisKey = `user_nome:${sender}`;
    return await redis.get(redisKey);
  } catch (error) {
    console.error(`❌ Erro ao recuperar nome do usuário: ${error.message}`);
    return null;
  }
};

// ❌ Remove o nome do usuário
const deleteNomeUsuario = async (sender) => {
  try {
    const redisKey = `user_nome:${sender}`;
    await redis.del(redisKey);
    console.log(`🧹 Nome do usuário ${sender} removido.`);
  } catch (error) {
    console.error(`❌ Erro ao deletar nome do usuário: ${error.message}`);
  }
};

const appendToConversation = async (sender, fragmento) => {
  const key = `conversa:${sender}`;
  const anterior = await redis.get(key);

  let historico = [];
  if (anterior) {
    try {
      historico = JSON.parse(anterior);
    } catch (e) {
      console.error("❌ Erro ao fazer parse do histórico:", e);
      historico = [];
    }
  }

  historico.push(fragmento);

  // Salva de volta no Redis
  await redis.set(key, JSON.stringify(historico));

  console.log("📝 Salvando no histórico (appendToConversation):", sender, "→", fragmento);
};


const getConversation = async (sender) => {
  const key = `conversa:${sender}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : [];
};

 


async function resetConversation(userId) {
  await redis.del(`conversa:${userId}`);

}

/**
 * 📅 Armazena a data/hora da primeira interação do usuário (apenas se ainda não existir)
 */
const setPrimeiraInteracao = async (userId) => {
  try {
    const key = `primeira_interacao:${userId}`;
    const timestamp = Date.now();
    await redis.setnx(key, timestamp); // só define se não existir
  } catch (error) {
    console.error(`❌ Erro ao definir primeira interação: ${error.message}`);
  }
};

/**
 * 📅 Retorna a data/hora da primeira interação (formato timestamp)
 */
const getPrimeiraInteracao = async (userId) => {
  try {
    const key = `primeira_interacao:${userId}`;
    const timestamp = await redis.get(key);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    console.error(`❌ Erro ao obter primeira interação: ${error.message}`);
    return null;
  }
};

/**
 * ❌ Remove a primeira interação registrada (para testes ou reset)
 */
const deletePrimeiraInteracao = async (userId) => {
  try {
    const key = `primeira_interacao:${userId}`;
    await redis.del(key);
    console.log(`🧹 Primeira interação do usuário ${userId} removida.`);
  } catch (error) {
    console.error(`❌ Erro ao deletar primeira interação: ${error.message}`);
  }
};

const pauseBotKey = "bot:pausado_global";

const pausarBotGlobalmente = async () => {
  await redis.set(pauseBotKey, "true");
};

const retomarBotGlobalmente = async () => {
  await redis.del(pauseBotKey);
};

const isBotPausado = async () => {
  return (await redis.get(pauseBotKey)) === "true";
};

// Adiciona mensagem temporária para represamento por 60s
const setMensagemTemporaria = async (senderId, conteudo) => {
  const chave = `buffer:mensagens:${senderId}`;
  const mensagensAtuais = await redis.get(chave);
  const atualizadas = mensagensAtuais ? JSON.parse(mensagensAtuais) : [];

  atualizadas.push(conteudo);

  // 🔁 Regrava com novo TTL (reinicia o timer)
  await redis.set(chave, JSON.stringify(atualizadas), "EX", 60);
};

// Recupera as mensagens temporárias represadas
const getMensagensTemporarias = async (senderId) => {
  const chave = `buffer:mensagens:${senderId}`;
  const mensagens = await redis.get(chave);
  return mensagens ? JSON.parse(mensagens) : [];
};

// Remove imediatamente o buffer (se quiser processar manualmente antes dos 60s)
const limparMensagensTemporarias = async (senderId) => {
  await redis.del(`buffer:mensagens:${senderId}`);
};

/**
 * Retorna todos os usuários que estão atualmente em um stage específico
 * @param {string} stage Procurar usuários nesse estágio
 * @returns {Promise<string[]>} Lista de senders (usuários)
 */
async function getAllUsuariosComStage(stage) {
  try {
    const keys = await redis.keys("stage:*");

    const result = [];

    for (const key of keys) {
      const sender = key.replace("stage:", "");
      const value = await redis.get(key);

      if (value === stage) {
        result.push(sender);
      }
    }

    return result;
  } catch (error) {
    console.error("❌ Erro ao buscar usuários com stage:", error);
    return [];
  }
}

const getTodosUsuariosComStageESemInteracao = async () => {
  const stageKeys = await redis.keys("user_stage:*");
  const usuarios = [];

  for (const stageKey of stageKeys) {
    const sender = stageKey.replace("user_stage:", "");
    const stage = await redis.get(stageKey);
    const ultimaInteracao = await redis.get(`user_last_interaction:${sender}`);

    usuarios.push({ sender, stage, ultimaInteracao });
  }

  return usuarios;
};

const salvarMensagemCitada = async ({ instanceId, messageId, dados }) => {
  const chave = `mensagem:enviada:${instanceId}:${messageId}`;
  await redis.hset(chave, dados);
  await redis.expire(chave, 60 * 60 * 72); // TTL de 24h
};

const recuperarMensagemCitada = async ({ instanceId, quotedMsgId }) => {
  const chave = `mensagem:enviada:${instanceId}:${quotedMsgId}`;
  const dados = await redis.hgetall(chave);
  return Object.keys(dados).length > 0 ? dados : null;
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
  getHistoricoDeModelosMencionados,
  storeHistoricoDeModelosMencionados,
  storeNomeUsuario,
  getNomeUsuario,
  deleteNomeUsuario,
  appendToConversation,
  getConversation,
  resetConversation,
  setPrimeiraInteracao,
  getPrimeiraInteracao,
  deletePrimeiraInteracao,
  pausarBotGlobalmente,
  retomarBotGlobalmente,
  isBotPausado,
  setMensagemTemporaria,
  getMensagensTemporarias,
  limparMensagensTemporarias,
  getAllUsuariosComStage,
  getTodosUsuariosComStageESemInteracao,
  salvarMensagemCitada,
  recuperarMensagemCitada,
  redis
};