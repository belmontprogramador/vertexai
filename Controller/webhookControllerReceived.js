// 📁 Controller/webhookControllerReceived.js

const{ checagemInicial } = require ("../Services/checagemInicial")

const webhookControllerReceived = async (req, res) => {
  try {
    const { messageId, sender, msgContent } = req.body; 
    const pushName = sender?.pushName;     

    if (!messageId || !sender?.id) {
      console.log("🚨 Nenhuma mensagem válida recebida.");
      return res.status(400).json({ error: "Mensagem inválida." });
    }

    const senderId = sender.id;
    const content =
      msgContent?.conversation?.trim() ||
      msgContent?.extendedTextMessage?.text?.trim();

    // 🔍 Debug: Exibir os dados brutos recebidos no webhook
    console.log("🔹 [DEBUG] Mensagem recebida:");
    console.log("🔸 messageId:", messageId);
    console.log("🔸 Remetente:", senderId);
    console.log("🔸 Conteúdo:", content);
    

    if (!content || !content.toLowerCase().startsWith("again")) {
      console.log("❌ Ignorado: mensagem não começa com 'again'.");
      console.log("------------------------------------------------")
      return res.status(200).json({ message: "Mensagem ignorada." });
    }  
    
    console.log("---------------------------------------")
    await checagemInicial(senderId, content, pushName)

    res.json({ message: "Mensagem processada com sucesso!" });    

  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    return res.status(500).json({ error: "Erro no processamento da mensagem." });
  }
};

module.exports = { webhookControllerReceived };
