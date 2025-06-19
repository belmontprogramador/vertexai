// Services/conversationManager.js
const redis = require('./redisClient');

const buildKey = (sender) => `conversa:${sender}`;

const appendToConversation = async (sender, fragmento) => {
  const key = buildKey(sender);
  const anterior = await redis.get(key);
  let historico = [];

  if (anterior) {
    try {
      historico = JSON.parse(anterior);
    } catch {
      console.error("❌ Erro ao fazer parse do histórico:", anterior);
    }
  }

  historico.push(fragmento);
  await redis.set(key, JSON.stringify(historico));
  console.log("📝 (appendToConversation):", sender, "→", fragmento);
};

const getConversation = async (sender) => {
  const key = buildKey(sender);
  const data = await redis.get(key);
  return data ? JSON.parse(data) : [];
};

const resetConversation = async (sender) => {
  const key = buildKey(sender);
  await redis.del(key);
  console.log("🧹 Histórico resetado para:", sender);
};

module.exports = {
  appendToConversation,
  getConversation,
  resetConversation
};
