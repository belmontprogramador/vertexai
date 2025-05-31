const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const INSTANCE_ID = process.env.INSTANCE_ID;
const WAPI_TOKEN = process.env.TOKEN;

/**
 * 📥 Obtém o áudio descriptografado via W-API
 * @param {string} mediaKey - Chave base64 fornecida pela mensagem
 * @param {string} directPath - Caminho relativo (não a URL completa!)
 * @param {string} tempDir - Diretório onde salvar o arquivo temporário
 * @returns {Promise<string>} Caminho local do arquivo .oga baixado
 */
async function obterAudioDescriptografadoViaWapi(mediaKey, directPath, tempDir = "./temp") {
  const inicio = Date.now();

  if (!INSTANCE_ID || !WAPI_TOKEN) {
    throw new Error("Credenciais da W-API ausentes: verifique INSTANCE_ID ou TOKEN no .env");
  }

  if (!mediaKey || !directPath) {
    throw new Error("Parâmetros inválidos: mediaKey e directPath são obrigatórios.");
  }

  const apiUrl = `https://api.w-api.app/v1/message/download-media?instanceId=${INSTANCE_ID}`;

  console.log("📤 Enviando requisição para W-API com payload:");
  console.log({
    mediaKey,
    directPath,
    type: "audio",
    mimetype: "audio/ogg; codecs=opus"
  });

  try {
    const response = await axios.post(
      apiUrl,
      {
        mediaKey,
        directPath,
        type: "audio",
        mimetype: "audio/ogg; codecs=opus",
      },
      {
        headers: {
          Authorization: `Bearer ${WAPI_TOKEN}`,
        },
      }
    );

    const fileUrl = response.data?.fileLink;
    if (!fileUrl) throw new Error("W-API não retornou fileLink.");

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileName = `${Date.now()}_${path.basename(fileUrl)}`;
    const localPath = path.join(tempDir, fileName);

    console.log("⬇️ Baixando áudio descriptografado de:", fileUrl);

    const audioResponse = await axios.get(fileUrl, { responseType: "stream" });
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(localPath);
      audioResponse.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const duracao = ((Date.now() - inicio) / 1000).toFixed(2);
    console.log(`🎧 Áudio descriptografado salvo em: ${localPath} (${duracao}s)`);

    return localPath;
  } catch (err) {
    console.error("❌ Erro ao obter áudio via W-API:", err.response?.data || err.message);
    throw new Error("Erro ao obter áudio via W-API.");
  }
}

module.exports = { obterAudioDescriptografadoViaWapi };
