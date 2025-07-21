const Redis = require("ioredis"); 

const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
  db: 0,
});

 

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


const deleteConversation = async (sender) => {
  const key = `conversa:${sender}`;
  const result = await redis.del(key);
  console.log(`🗑️ Histórico deletado para ${sender}. Resultado:`, result);
};


 // 📅 Armazena a data/hora da primeira interação do usuário (apenas se ainda não existir)
const setPrimeiraInteracao = async (userId) => {
  try {
    const key = `primeira_interacao:${userId}`;
    const timestamp = Date.now();
    await redis.setnx(key, timestamp); // só define se não existir
  } catch (error) {
    console.error(`❌ Erro ao definir primeira interação: ${error.message}`);
  }
};
 
 // 📅 Retorna a data/hora da primeira interação (formato timestamp)  
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

//❌ Remove a primeira interação registrada (para testes ou reset)
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

const getTodosUsuariosComStageESemInteracao = async () => {
  const stageKeys = await redis.keys("user_stage:*");
  const usuarios = [];

  for (const stageKey of stageKeys) {
    const sender = stageKey.replace("user_stage:", "");
    const stage = await redis.get(stageKey);
    const ultimaInteracao = await redis.get(`last_interaction:${sender}`); // ✅ corrigido

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

// 📌 Pausa o bot apenas para um usuário específico
const pausarBotParaUsuario = async (userId) => {
  await redis.set(`bot:pausado:${userId}`, "true");
};

// 🔄 Retoma o bot para um usuário específico
const retomarBotParaUsuario = async (userId) => {
  await redis.del(`bot:pausado:${userId}`);
};

// ❓ Verifica se o bot está pausado para o usuário (ou globalmente)
const isBotPausadoParaUsuario = async (userId) => {
  const global = await redis.get(pauseBotKey);
  const individual = await redis.get(`bot:pausado:${userId}`);
  return global === "true" || individual === "true";
};

const getMensagemPorTempo = (template, minutos, nome) => {
  const chaves = Object.keys(template)
    .map(k => parseInt(k))
    .sort((a, b) => a - b);

  for (const tempo of chaves) {
    if (minutos >= tempo) {
      let mensagem = template[tempo];
      if (mensagem.includes("{{nome}}")) {
        return mensagem.replace(/{{nome}}/g, nome || ""); // fallback de nome
      }
      return mensagem;
    }
  }

  return null;
};


const marcarRemarketingComoEnviado = async (sender, stage, tempo) => {
  const status = await getRemarketingStatus(sender);
  if (!status[stage]) status[stage] = {};
  status[stage][tempo] = true;
  await redis.set(`remarketing_enviado:${sender}`, JSON.stringify(status));
};

const resetarTodosRemarketingStatus = async () => {
  try {
    const chaves = await redis.keys("remarketing_enviado:*");
    if (chaves.length === 0) {
      console.log("ℹ️ Nenhum status de remarketing encontrado para resetar.");
      return;
    }

    const resultado = await redis.del(...chaves);
    console.log(`🧹 Resetados ${resultado} status de remarketing no total.`);
  } catch (error) {
    console.error(`❌ Erro ao resetar status de remarketing: ${error.message}`);
  }
};

const getRemarketingStatus = async (sender) => {
  const raw = await redis.get(`remarketing_enviado:${sender}`);
  return raw ? JSON.parse(raw) : {};
};

const getUsuariosComBotPausado = async () => {
  try {
    const chaves = await redis.keys("bot:pausado:*");
    const usuarios = chaves.map(chave => chave.replace("bot:pausado:", ""));
    console.log(`📋 Usuários com bot pausado individualmente: ${usuarios.length}`);
    return usuarios;
  } catch (error) {
    console.error("❌ Erro ao buscar usuários com bot pausado:", error);
    return [];
  }
};






module.exports = {        
  storeUserResponse,
  getUserResponses,
  setUserStage,
  getUserStage,
  deleteUserStage,  
  setLastInteraction,
  getLastInteraction,
  deleteLastInteraction,  
  getUserResponses,
  deleteUserResponses, 
  storeNomeUsuario,
  getNomeUsuario,
  deleteNomeUsuario,
  appendToConversation,
  getConversation,
  deleteConversation,
  setPrimeiraInteracao,
  getPrimeiraInteracao,
  deletePrimeiraInteracao,
  pausarBotGlobalmente,
  retomarBotGlobalmente,
  isBotPausado,   
  getTodosUsuariosComStageESemInteracao,
  salvarMensagemCitada,
  recuperarMensagemCitada,
  pausarBotParaUsuario,
  retomarBotParaUsuario,
  isBotPausadoParaUsuario,
  getMensagemPorTempo,
  marcarRemarketingComoEnviado,
  resetarTodosRemarketingStatus,
  getRemarketingStatus,
  getUsuariosComBotPausado,
  redis
};