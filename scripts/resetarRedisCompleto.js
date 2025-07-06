const Redis = require("ioredis");

// ⚠️ Certifique-se de usar as mesmas configs do seu ambiente
const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
  db: 0,
});

(async () => {
  try {
    console.log("⚠️ Iniciando limpeza total do Redis...");

    const keys = await redis.keys("*");

    if (keys.length === 0) {
      console.log("✅ Nenhuma chave encontrada. Redis já está limpo.");
      process.exit(0);
    }

    console.log(`🧹 Total de ${keys.length} chaves encontradas. Deletando...`);

    // Pode deletar em blocos se for muitas chaves
    const deleted = await redis.del(...keys);

    console.log(`✅ ${deleted} chaves deletadas com sucesso.`);
  } catch (error) {
    console.error("❌ Erro ao limpar Redis:", error.message);
  } finally {
    redis.disconnect();
    process.exit(0);
  }
})();
