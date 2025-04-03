// 📁 Controller/webhookControllerReceived.js
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { checagemInicial } = require("../Services/checagemInicial");
const { agenteDeTranscricao } = require("../Services/agenteDeTranscricao");

const webhookControllerReceived = async (req, res) => {
  try {
    const { messageId, sender, msgContent, mediaUrl } = req.body;
    const pushName = sender?.pushName;
    const senderId = sender?.id;

    if (!messageId || !senderId) {
      console.log("🚨 Nenhuma mensagem válida recebida.");
      return res.status(400).json({ error: "Mensagem inválida." });
    }

    let content =
      msgContent?.conversation?.trim() ||
      msgContent?.extendedTextMessage?.text?.trim();

    const isAudio = msgContent?.audioMessage;

    if (mediaUrl && isAudio) {
      console.log("🎧 Áudio recebido! Iniciando download e transcrição...");

      try {
        const tempDir = path.join(__dirname, "..", "temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        const audioPath = path.join(tempDir, `${messageId}.oga`);
        const writer = fs.createWriteStream(audioPath);

        const response = await axios.get(mediaUrl, { responseType: "stream" });
        await new Promise((resolve, reject) => {
          response.data.pipe(writer);
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        const stats = fs.statSync(audioPath);
        if (stats.size === 0) {
          fs.unlinkSync(audioPath);
          throw new Error("Arquivo de áudio vazio.");
        }

        content = await agenteDeTranscricao(audioPath);
        console.log("📝 Transcrição feita:", content);

        fs.unlinkSync(audioPath);
      } catch (err) {
        console.error("❌ Erro ao processar áudio:", err.message);
        return res.status(500).json({ error: "Erro ao processar o áudio." });
      }
    }

    if (!content || !content.toLowerCase().startsWith("again")) {
      console.log("❌ Ignorado: mensagem não começa com 'again'.");
      return res.status(200).json({ message: "Mensagem ignorada." });
    }

    console.log("🧠 Conteúdo pronto para checagem:", content);
    await checagemInicial(senderId, content, pushName);

    return res.json({ message: "Mensagem processada com sucesso!" });

  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    return res.status(500).json({ error: "Erro no processamento da mensagem." });
  }
};

module.exports = { webhookControllerReceived };