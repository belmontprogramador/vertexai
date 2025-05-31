const axios = require("axios");
require("dotenv").config();

const INSTANCE_ID = process.env.INSTANCE_ID;
const TOKEN = process.env.TOKEN;

const API_TEXT_URL = `https://api.w-api.app/v1/message/send-text?instanceId=${INSTANCE_ID}`;
const API_IMAGE_URL = `https://api.w-api.app/v1/message/send-image?instanceId=${INSTANCE_ID}`;
const API_VIDEO_URL = `https://api.w-api.app/v1/message/send-video?instanceId=${INSTANCE_ID}`

const sendBotMessage = async (sender, payload) => {
  try {
    if (typeof payload === "string") {
      // Texto simples
      const response = await axios.post(
        API_TEXT_URL,
        {
          phone: sender,
          message: payload,
          delayMessage: 3,
        },
        {
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log(`✅ Mensagem de texto enviada para ${sender}:`, response.data);
    } else if (typeof payload === "object" && payload.imageUrl) {
      // Imagem com legenda
      const response = await axios.post(
        API_IMAGE_URL,
        {
          phone: sender,
          image: payload.imageUrl,
          caption: payload.caption || "",
          delayMessage: 3,
        },
        {
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log(`🖼️ Imagem enviada para ${sender}:`, response.data);
    } else if (typeof payload === "object" && payload.videoUrl) {
      // Vídeo com legenda
      const response = await axios.post(
        API_VIDEO_URL,
        {
          phone: sender,
          video: payload.videoUrl,
          caption: payload.caption || "",
          delayMessage: 3,
        },
        {
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log(`🎬 Vídeo enviado para ${sender}:`, response.data);
    } else {
      console.warn("❌ Payload inválido para sendBotMessage:", payload);
    }
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem:", error.response?.data || error.message);
  }
};


module.exports = { sendBotMessage };
