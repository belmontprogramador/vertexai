/**
 * 🧨 Apaga do Redis todas as chaves que foram gravadas nos últimos 3 dias
 * Isso considera timestamps salvos como `Date.now()` (em milissegundos)
 */

const Redis = require("ioredis"); 

const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
  db: 0,
});

 

const apagarChavesDosUltimosTresDias = async () => {
    const agora = Date.now();
    const limiteInferior = agora - 72 * 60 * 60 * 1000; // 72 horas atrás
    let deletadas = 0;
  
    const chaves = await redis.keys("*");
  
    for (const chave of chaves) {
      let timestamp = null;
  
      // Casos simples com timestamp direto
      if (
        chave.includes("user_stage_time:") ||
        chave.includes("last_interaction:") ||
        chave.includes("primeira_interacao:")
      ) {
        const valor = await redis.get(chave);
        timestamp = parseInt(valor, 10);
        if (!isNaN(timestamp) && timestamp >= limiteInferior) {
          await redis.del(chave);
          deletadas++;
          console.log(`🧹 Apagada: ${chave}`);
        }
      }
  
      // Respostas com timestamps no formato hset
      if (chave.includes("_timestamp") || chave.startsWith("user_responses:")) {
        const campos = await redis.hgetall(chave);
        const timestamps = Object.keys(campos)
          .filter(k => k.endsWith("_timestamp"))
          .map(k => parseInt(campos[k], 10));
  
        if (timestamps.some(ts => !isNaN(ts) && ts >= limiteInferior)) {
          await redis.del(chave);
          deletadas++;
          console.log(`🧹 Apagada (resposta): ${chave}`);
        }
      }
  
      // Conversas com histórico JSON
      if (chave.startsWith("conversa:")) {
        const raw = await redis.get(chave);
        try {
          const historico = JSON.parse(raw);
          const contemRecentes = historico.some(
            msg => msg.timestamp && msg.timestamp >= limiteInferior
          );
          if (contemRecentes) {
            await redis.del(chave);
            deletadas++;
            console.log(`🧹 Apagada (conversa): ${chave}`);
          }
        } catch (e) {
          console.warn(`⚠️ Erro ao ler conversa: ${chave}`);
        }
      }
  
      // Mensagens citadas com TTL (removemos se ainda não expirou)
      if (chave.startsWith("mensagem:enviada:")) {
        const ttl = await redis.ttl(chave);
        const tempoCriacaoEstimada = agora - (ttl * 1000);
        if (ttl > 0 && tempoCriacaoEstimada >= limiteInferior) {
          await redis.del(chave);
          deletadas++;
          console.log(`🧹 Apagada (mensagem citada): ${chave}`);
        }
      }
    }
  
    console.log(`✅ Total de chaves apagadas dos últimos 3 dias: ${deletadas}`);
  };
  
  // Execute
  apagarChavesDosUltimosTresDias();
  