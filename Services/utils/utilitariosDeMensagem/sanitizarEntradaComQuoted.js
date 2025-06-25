const { appendToConversation } = require("../../HistoricoDeConversas/conversationManager");

async function sanitizarEntradaComQuoted(sender,msgContent, quotedMessage) {
    const entrada = typeof msgContent === "string"
      ? msgContent
      : msgContent?.termosRelacionados || "";
  
    const primeiraLinhaQuoted = typeof quotedMessage === "string"
      ? quotedMessage.split("\n")[0] || ""
      : "";
  
    const quotedSemEmoji = primeiraLinhaQuoted.replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]|\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu,
      ""
    ).trim();
  
    const entradaFinal = `${entrada.trim()} ${quotedSemEmoji}`.trim();

    await appendToConversation(sender, JSON.stringify({
      tipo: "entrada_usuario",
      conteudo: entradaFinal,
      timestamp: new Date().toISOString()
    }));

    return entradaFinal || "o cliente marcou uma mensagem mas não escreveu nada";
  }
  
  module.exports = { sanitizarEntradaComQuoted };
