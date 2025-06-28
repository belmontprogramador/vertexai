const { redis } = require("../../redisService");

const CHAVE_BLOQUEIO = (sender) => `bloqueio:${sender}`;
const CHAVE_FILA = (sender) => `fila:mensagens:${sender}`;

let processarMensagemExternamente = null; // será injetado externamente

// ✅ Injeção da função que irá processar as mensagens após o bloqueio
const injectProcessor = (fn) => {
  processarMensagemExternamente = fn;
};

// ✅ Verifica se o usuário está bloqueado
const estaBloqueado = async (sender) => {
  const bloqueado = await redis.exists(CHAVE_BLOQUEIO(sender));
  return bloqueado === 1;
};

// ✅ Enfileira mensagens durante o bloqueio
const enfileirarMensagem = async (sender, mensagem) => {
  // mensagem é um objeto contendo: { content, pushName, messageId, quotedMessage }
  await redis.rpush(CHAVE_FILA(sender), JSON.stringify(mensagem));

  console.log(`📥 Mensagem enfileirada de ${sender}:`, mensagem);
};

// ✅ Bloqueia por tempo X e processa TODAS as mensagens da fila uma por uma após o tempo
const setBloqueioComFila = async (sender, segundos = 5) => {
  await redis.set(CHAVE_BLOQUEIO(sender), "1", "EX", segundos);

  setTimeout(async () => {
    try {
      const mensagens = await redis.lrange(CHAVE_FILA(sender), 0, -1);
      if (mensagens.length === 0) return;

      await redis.del(CHAVE_FILA(sender)); // limpa a fila

      // Junta todo o conteúdo das mensagens com "|"
      const frases = mensagens
        .map((item) => {
          try {
            const obj = JSON.parse(item);
            return obj?.content?.trim();
          } catch {
            return "";
          }
        })
        .filter(Boolean);

      const mensagemFinal = frases.join(" | ");

      const primeiroItem = JSON.parse(mensagens[0]); // usa metadados do primeiro

      const { pushName, quotedMessage, messageId } = primeiroItem;

      console.log(`📤 Enviando mensagem unificada de ${sender}: "${mensagemFinal}"`);

      if (typeof processarMensagemExternamente === "function") {
        await processarMensagemExternamente(
          sender,
          mensagemFinal,
          messageId || "fila",
          quotedMessage || null,
          pushName || ""
        );
      } else {
        console.warn("⚠️ Nenhuma função injetada para processar mensagens agrupadas.");
      }
    } catch (err) {
      console.error(`❌ Erro ao processar fila de ${sender}:`, err.message);
    }
  }, segundos * 1000);
};


module.exports = {
  estaBloqueado,
  enfileirarMensagem,
  setBloqueioComFila,
  injectProcessor
};
