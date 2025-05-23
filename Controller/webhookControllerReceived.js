const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { checagemInicial } = require("../Services/checagemInicial");
const { agenteDeTranscricao } = require("../Services/agenteDeTranscricao");
const {
  isBotPausado,
  setPrimeiraInteracao,
  getPrimeiraInteracao
} = require("../Services/redisService");

const webhookControllerReceived = async (req, res) => {
  try {
    const { messageId, sender, msgContent, mediaUrl } = req.body;
    const senderId = sender?.id;
    const pushName = sender?.pushName;

    if (!messageId || !senderId) {
      console.log("🚨 Mensagem inválida recebida.");
      return res.status(400).json({ error: "Mensagem inválida." });
    }

    // 🚫 Verificação de pausa global
    const pausado = await isBotPausado();
    if (pausado) {
      console.log(`⛔ Bot pausado. Ignorando mensagem de ${senderId}`);
      return res.status(200).json({ message: "Bot pausado" });
    }

    // 🧠 Extrai conteúdo textual
    let content =
      msgContent?.conversation?.trim() ||
      msgContent?.extendedTextMessage?.text?.trim() ||
      "";

    const isAudio = msgContent?.audioMessage;

    // 🔊 Transcreve áudio se houver
    if (mediaUrl && isAudio) {
      try {
        console.log("🎧 Áudio recebido. Iniciando transcrição...");
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
        fs.unlinkSync(audioPath);
        console.log("📝 Transcrição concluída:", content);
      } catch (err) {
        console.error("❌ Erro ao transcrever áudio:", err.message);
        return res.status(500).json({ error: "Erro ao processar o áudio." });
      }
    }

    // ❌ Ignora mensagens que não começam com "again"
    if (!content.toLowerCase().startsWith("again")) {
      console.log("❌ Ignorado: mensagem não começa com 'again'.");
      return res.status(200).json({ message: "Mensagem ignorada." });
    }

    console.log("🧠 Conteúdo pronto para checagem:", content);

    // 🗓️ Registra primeira interação
    await setPrimeiraInteracao(senderId);
    const primeiraInteracao = await getPrimeiraInteracao(senderId);

    if (primeiraInteracao) {
      const data = new Date(Number(primeiraInteracao));
      const dataLimite = new Date("2025-05-14T00:00:00-03:00").getTime();

      const formatada = data.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      console.log(`📅 Primeira interação do usuário ${senderId}: ${formatada}`);

      if (data.getTime() >= dataLimite) {
        console.log("✅ Interação válida → executando checagemInicial");
        await checagemInicial(senderId, content, pushName);
      } else {
        console.log("⏳ Interação anterior a 14/05/2025 → checagemInicial ignorada");
      }
    } else {
      console.log(`⚠️ Usuário ${senderId} ainda não tem primeira interação salva.`);
    }

    return res.status(200).json({ message: "Mensagem processada com sucesso!" });
  } catch (error) {
    console.error("❌ Erro no webhookControllerReceived:", error);
    return res.status(500).json({ error: "Erro no processamento da mensagem." });
  }
};

module.exports = { webhookControllerReceived };
