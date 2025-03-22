const axios = require("axios");
require("dotenv").config();


const INSTANCE_ID = process.env.INSTANCE_ID;
const API_URL = `https://api.w-api.app/v1/message/send-text?instanceId=${INSTANCE_ID}`;
const TOKEN = process.env.TOKEN;

/**
 * 📤 Envia mensagem do bot via API
 */
const sendBotMessage = async (sender, responseMessage) => {
  try {
    const response = await axios.post(
      API_URL,
      {
        phone: sender,
        message: responseMessage,
        delayMessage: 3,
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`✅ Mensagem enviada para ${sender}:`, response.data);
    console.log("------------------------------------------")
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem:", error.response?.data || error.message);
  }
};

module.exports = { sendBotMessage };
