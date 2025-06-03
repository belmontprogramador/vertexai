const axios = require("axios");
require("dotenv").config();

const INSTANCE_ID = process.env.INSTANCE_ID;
const TOKEN = process.env.TOKEN;

const API_TEXT_URL = `https://api.w-api.app/v1/message/send-text?instanceId=${INSTANCE_ID}`;
const API_IMAGE_URL = `https://api.w-api.app/v1/message/send-image?instanceId=${INSTANCE_ID}`;
const API_VIDEO_URL = `https://api.w-api.app/v1/message/send-video?instanceId=${INSTANCE_ID}`;

/**
 * Envia mensagem para o WhatsApp, com suporte a texto, imagem, vídeo e quotedMsgId (resposta citada)
 * @param {string} sender - número de telefone (ex: "5522999999999")
 * @param {object|string} payload - string para mensagem de texto ou objeto com campos (imageUrl, videoUrl, caption, quotedMsgId)
 */
const sendBotMessage = async (sender, payload) => {
  try {
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    };

    if (typeof payload === "string") {
      // Texto simples
      const body = {
        phone: sender,
        message: payload,
        delayMessage: 3,
      };

      const response = await axios.post(API_TEXT_URL, body, { headers });
      console.log(`✅ Mensagem de texto enviada para ${sender}:`, response.data);

    } else if (typeof payload === "object" && payload.imageUrl) {
      // Imagem com legenda e possível quoted
      const body = {
        phone: sender,
        image: payload.imageUrl,
        caption: payload.caption || "",
        delayMessage: 3,
      };

      if (payload.quotedMsgId) body.quotedMsgId = payload.quotedMsgId;

      const response = await axios.post(API_IMAGE_URL, body, { headers });
      console.log(`🖼️ Imagem enviada para ${sender}:`, response.data);

    } else if (typeof payload === "object" && payload.videoUrl) {
      // Vídeo com legenda e possível quoted
      const body = {
        phone: sender,
        video: payload.videoUrl,
        caption: payload.caption || "",
        delayMessage: 3,
      };

      if (payload.quotedMsgId) body.quotedMsgId = payload.quotedMsgId;

      const response = await axios.post(API_VIDEO_URL, body, { headers });
      console.log(`🎬 Vídeo enviado para ${sender}:`, response.data);

    } else if (typeof payload === "object" && payload.message) {
      // Texto com quoted
      const body = {
        phone: sender,
        message: payload.message,
        delayMessage: 3,
      };

      if (payload.quotedMsgId) body.quotedMsgId = payload.quotedMsgId;

      const response = await axios.post(API_TEXT_URL, body, { headers });
      console.log(`💬 Texto com citação enviado para ${sender}:`, response.data);
    } else {
      console.warn("❌ Payload inválido para sendBotMessage:", payload);
    }
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem:", error.response?.data || error.message);
  }
};

module.exports = { sendBotMessage };
