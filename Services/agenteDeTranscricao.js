const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define o caminho do ffmpeg
ffmpeg.setFfmpegPath("C:/ffmpeg/bin/ffmpeg.exe");

const agenteDeTranscricao = async (originalPath) => {
  const mp3Path = originalPath.replace(path.extname(originalPath), ".mp3");

  try {
    // 🔄 Converte o arquivo .oga/.ogg para .mp3
    await new Promise((resolve, reject) => {
      ffmpeg(originalPath)
        .toFormat("mp3")
        .on("error", reject)
        .on("end", resolve)
        .save(mp3Path);
    });

    console.log("🎵 Áudio convertido com sucesso para:", mp3Path);

    const audioFile = fs.createReadStream(mp3Path);
    const response = await openai.audio.transcriptions.create({
      model: "whisper-1", // ou "gpt-4o-transcribe"
      file: audioFile,
      response_format: "text",
      prompt: "Mensagem de voz clara em português enviada por WhatsApp."
    });

    const texto = response.text?.trim();
    if (!texto || texto.length < 2) {
      throw new Error("Transcrição retornou vazia.");
    }

    return `again ${texto.toLowerCase()}`;
  } catch (err) {
    console.error("❌ Erro na transcrição de áudio:", err.message);
    throw new Error(err.message || "Erro na transcrição.");
  } finally {
    if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
    if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
  }
};

module.exports = { agenteDeTranscricao };
