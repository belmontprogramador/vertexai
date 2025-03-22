// 📤 Controller para mensagens enviadas
const webhookControllerSent = async (req, res) => {
  try {
    const { messageId, chat, msgContent, fromMe, sender } = req.body;

    if (!fromMe || !msgContent || !messageId || !chat?.id || !sender?.id) {
      return res.status(400).json({ error: "Nenhuma mensagem válida recebida" });
    }

    const senderId = sender.id;
    const verifiedBizName = sender.verifiedBizName || "Não verificado";
    const recipientId = chat.id;

    // 🔍 Captura o conteúdo da mensagem (somente texto)
    const content =
      msgContent?.extendedTextMessage?.text ||
      msgContent?.conversation ||
      null;

    if (!content) {
      return res.status(200).json({ message: "Mensagem sem texto ignorada." });
    }

    // ✅ Log final somente com os dados relevantes
    console.log(`
📤 [DEBUG] Mensagem enviada:
- ID: ${messageId}
- Remetente: ${senderId} (Negócio: ${verifiedBizName})
- Destinatário: ${recipientId}
- Conteúdo: ${content}
------------------------------------------------`);

    return res.json({ message: "Mensagem enviada processada com sucesso!" });
  } catch (error) {
    console.error("❌ Erro ao processar webhook de mensagens enviadas:", error);
    res.status(500).json({ error: "Erro ao processar a mensagem enviada" });
  }
};

module.exports = { webhookControllerSent };
