// 📁 Controller/webhookControllerReceived.js
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { checagemInicial } = require("../Services/checagemInicial");
const { agenteDeTranscricao } = require("../Services/agenteDeTranscricao");
const { isBotPausado, setPrimeiraInteracao, getPrimeiraInteracao } = require("../Services/redisService");
const { DateTime } = require("luxon");

const webhookControllerReceived = async (req, res) => {
  try {
    const { messageId, sender, msgContent, mediaUrl } = req.body;
    const pushName = sender?.pushName;
    const senderId = sender?.id;

    if (!messageId || !senderId) {
      console.log("🚨 Nenhuma mensagem válida recebida.");
      return res.status(400).json({ error: "Mensagem inválida." });
    }

    if (await isBotPausado()) {
      console.log("⏸️ Bot pausado. Ignorando mensagem recebida.");
      return res.status(200).json({ message: "Bot pausado. Mensagem ignorada." });
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

    // 🧾 Garante que a primeira interação seja registrada SEMPRE
    await setPrimeiraInteracao(senderId);
    const timestamp = await getPrimeiraInteracao(senderId);
    const dataFormatada = DateTime.fromMillis(timestamp)
      .setZone("America/Sao_Paulo")
      .toFormat("dd/MM/yyyy HH:mm:ss");

    console.log(`📅 Primeira interação registrada de ${senderId} em: ${dataFormatada}`);

    const DATA_LIMITE = DateTime.fromISO("2025-06-03T11:20:00", {
      zone: "America/Sao_Paulo",
    }).toMillis();

    if (timestamp < DATA_LIMITE) {
      console.log("⏳ Interação anterior à data limite. Ignorada.");
      return res.status(200).json({ message: "Interação anterior à data limite. Ignorada." });
    }

    // ✅ Só entra no fluxo se a mensagem contém 'again'
    if (!content || !content.toLowerCase().startsWith("again")) {
      console.log("⚠️ Mensagem não contém 'again'. Ignorada após registro.");
      return res.status(200).json({ message: "Mensagem ignorada (sem 'again')." });
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