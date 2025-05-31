const fs = require("fs");
const path = require("path");
const axios = require("axios");
const ffmpeg = require("fluent-ffmpeg");
const { OpenAI } = require("openai");
require("dotenv").config();

const { checagemInicial } = require("../Services/checagemInicial");
const {
  isBotPausado,
  setPrimeiraInteracao,
  getPrimeiraInteracao
} = require("../Services/redisService");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
ffmpeg.setFfmpegPath("C:/ffmpeg/bin/ffmpeg.exe");

// 🔁 Transcreve o áudio local
const agenteDeTranscricao = async (originalPath) => {
  const mp3Path = originalPath.replace(path.extname(originalPath), ".mp3");

  try {
    // 🔄 Converte .oga para .mp3 (parâmetros ideais para Whisper)
    await new Promise((resolve, reject) => {
      ffmpeg(originalPath)
        .audioFrequency(16000) // -ar 16000
        .audioChannels(1)      // -ac 1
        .toFormat("mp3")
        .on("error", reject)
        .on("end", resolve)
        .save(mp3Path);
    });

    if (!fs.existsSync(mp3Path)) {
      throw new Error("Arquivo MP3 não foi gerado!");
    }

    const stats = fs.statSync(mp3Path);
    console.log(`📏 Tamanho do MP3: ${stats.size} bytes`);

    if (stats.size < 1000) {
      throw new Error("MP3 gerado é muito pequeno. Provavelmente o áudio original está vazio ou inválido.");
    }

    console.log("🎵 Áudio convertido com sucesso para:", mp3Path);

    // 🔊 Copiar para pasta debug_audios
    let debugUrl = null;
    try {
      const debugDir = path.join(__dirname, "..", "debug_audios");
      if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir);
      const debugPath = path.join(debugDir, path.basename(mp3Path));
      fs.copyFileSync(mp3Path, debugPath);

      // 🔗 Gerar URL pública para navegador
      const fileName = path.basename(mp3Path);
      debugUrl = `http://localhost:3000/audios/${fileName}`;

      console.log("🛠️ MP3 copiado para debug:", debugPath);
      console.log("▶️ Para escutar: start", debugPath);
      console.log("🌐 Escutar via navegador:", debugUrl);
    } catch (copyErr) {
      console.error("❌ Falha ao copiar MP3 para debug_audios:", copyErr.message);
    }

    // 🔠 Transcreve com Whisper
    const audioFile = fs.createReadStream(mp3Path);
    const response = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
      response_format: "text",
      language: "pt",
      prompt: "Mensagem de voz clara em português enviada por WhatsApp.",
    });

    const texto = response.text?.trim();
    if (!texto || texto.length < 2) {
      throw new Error("Transcrição retornou vazia.");
    }

    // 🔁 Retorna a transcrição e a URL do áudio
    return `again ${texto.toLowerCase()} \n🔗 Ouça: ${debugUrl || "arquivo não disponível"}`;
  } catch (err) {
    console.error("❌ Erro na transcrição de áudio:", err.message);
    throw new Error(err.message || "Erro na transcrição.");
  }
};


// 🔓 Faz requisição para W-API e baixa o áudio descriptografado
const baixarAudioViaWapi = async (mediaKey, directPath, tempDir = "./temp") => {
  const instanceId = process.env.INSTANCE_ID;
  const token = process.env.TOKEN;
  const apiUrl = `https://api.w-api.app/v1/message/download-media?instanceId=${instanceId}`;

  const response = await axios.post(apiUrl, {
    mediaKey,
    directPath,
    type: "audio",
    mimetype: "audio/ogg; codecs=opus"
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const fileUrl = response.data.fileLink;
  if (!fileUrl) throw new Error("W-API não retornou fileLink.");

  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const fileName = `${Date.now()}_${path.basename(fileUrl)}`;
  const localPath = path.join(tempDir, fileName);

  const audioResponse = await axios.get(fileUrl, { responseType: "stream" });
  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(localPath);
    audioResponse.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  console.log("🎧 Áudio salvo em:", localPath);
  return localPath;
};

// 🚀 Webhook principal
const webhookControllerReceived = async (req, res) => {
  try {
    const { messageId, sender, msgContent } = req.body;
    const senderId = sender?.id;
    const pushName = sender?.pushName;

    const isAudio = !!msgContent?.audioMessage;
    const mediaKey = msgContent?.audioMessage?.mediaKey;
    const directPath = msgContent?.audioMessage?.directPath;

    if (!messageId || !senderId) {
      console.log("🚨 Mensagem inválida recebida.");
      return res.status(400).json({ error: "Mensagem inválida." });
    }

    const pausado = await isBotPausado();
    if (pausado) {
      console.log(`⛔ Bot pausado. Ignorando mensagem de ${senderId}`);
      return res.status(200).json({ message: "Bot pausado" });
    }

    let content =
      msgContent?.conversation?.trim() ||
      msgContent?.extendedTextMessage?.text?.trim() ||
      "";

    if (isAudio && mediaKey && directPath) {
      try {
        console.log("🎧 Áudio recebido. Iniciando decriptação via W-API...");
        const tempDir = path.join(__dirname, "..", "temp");
        const audioPath = await baixarAudioViaWapi(mediaKey, directPath, tempDir);
        content = await agenteDeTranscricao(audioPath);

        console.log("📝 Transcrição:", content);
      } catch (err) {
        console.error("❌ Erro no processo de áudio:", err.message);
        return res.status(500).json({ error: "Erro ao processar áudio." });
      }
    }

    if (!content.toLowerCase().startsWith("again")) {
      console.log("❌ Ignorado: mensagem não começa com 'again'.");
      return res.status(200).json({ message: "Mensagem ignorada." });
    }

    console.log("🧠 Conteúdo para checagem:", content);
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

      console.log(`📅 Primeira interação de ${senderId}: ${formatada}`);

      if (data.getTime() >= dataLimite) {
        await checagemInicial(senderId, content, pushName);
      } else {
        console.log("⏳ Interação anterior a 14/05/2025 → checagemInicial ignorada");
      }
    }

    return res.status(200).json({ message: "Mensagem processada com sucesso!" });
  } catch (err) {
    console.error("❌ Erro no webhook:", err.message);
    return res.status(500).json({ error: "Erro interno no webhook." });
  }
};

module.exports = { webhookControllerReceived };
