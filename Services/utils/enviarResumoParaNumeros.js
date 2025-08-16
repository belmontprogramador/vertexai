const { getConversation } = require("../../Services/redisService");
const { sendBotMessage } = require("../../Services/messageSender");

// 📱 Lista fixa de números que receberão o resumo
const numerosDestino = [
  "5522991059167",
   
  "5522988319544",
 
"5522998668966",
];

/**
 * 📤 Envia resumo da conversa e modelos demonstrados para números internos
 * @param {string} senderId - ID do usuário (ex: 5521999999999)
 */
async function enviarResumoParaNumeros(senderId) {
  try {
    const historico = await getConversation(senderId);

    if (!historico || !Array.isArray(historico)) {
      console.log(`❌ Sem histórico para ${senderId}`);
      return;
    }

    const mensagensUsuario = historico.filter(h => h.tipo === "entrada_usuario");
    const modelosExibidos = historico
      .filter(h => h.tipo === "modelo_sugerido" || h.tipo === "modelo_confirmado")
      .map(m => `• ${m.conteudo?.nomeModelo || m.conteudo}`);

    const resumo = `
📱 *Resumo do atendimento com ${senderId}*

🗨️ *Conversa:*
${mensagensUsuario.map(m => `→ ${m.conteudo}`).join("\n")}

📦 *Modelos demonstrados:*
${modelosExibidos.length ? modelosExibidos.join("\n") : "Nenhum modelo registrado."}
`.trim();

    for (const numero of numerosDestino) {
      await sendBotMessage(numero, resumo);
    }

    console.log(`✅ Resumo enviado para ${numerosDestino.length} números`);
  } catch (err) {
    console.error("❌ Erro ao enviar resumo:", err);
  }
}

module.exports = { enviarResumoParaNumeros };
