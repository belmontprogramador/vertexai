const { saveMessage } = require("../Services/messageService");

const webhookController = async (req, res) => {
  try {
    const { instanceId, data } = req.body; // O W-API envia os dados dentro de um objeto "data"

    if (!data || !data.messages || data.messages.length === 0) {
      return res.status(400).json({ error: "Nenhuma mensagem recebida" });
    }

    for (const message of data.messages) {
      const messageId = message.id;
      const sender = message.from; // Número do WhatsApp que enviou a mensagem
      const content = message.body; // Conteúdo da mensagem

      if (!messageId || !sender || !content) {
        console.log("Mensagem inválida recebida:", message);
        continue;
      }

      // Salvar a mensagem e gerar embedding
      await saveMessage(messageId, sender, content);
    }

    res.json({ message: "Mensagens processadas com sucesso!" });
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    res.status(500).json({ error: "Erro ao processar a mensagem recebida" });
  }
};

module.exports = { webhookController };
