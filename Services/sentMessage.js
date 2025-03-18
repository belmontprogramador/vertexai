const axios = require("axios");


const INSTANCE_ID = process.env.INSTANCE_ID;
const API_URL = `https://api.w-api.app/v1/message/send-text?instanceId=${INSTANCE_ID}`;
const TOKEN = process.env.TOKEN;

/**
 * 📌 Processa e envia resposta baseada no Routine Service, incluindo a rotina e a resposta gerada
 */
const processAndSendMessage = async (senderId, content) => {
  const { generateRoutine } = require("./routineService");
  if (!content.toLowerCase().startsWith("kisuco")) {
    console.log("❌ Mensagem ignorada (não começa com 'kisuco').");
    return;
  }

  console.log(`🚀 Processando mensagem de ${senderId}: ${content}`);

  try {
    const { routine, response } = await generateRoutine(senderId, content);

    if (!routine || routine.includes("Erro ao gerar a rotina")) {
      console.error("❌ Erro na rotina de atendimento. Verifique os logs do Routine Service.");
      return;
    }

    console.log(`📩 Rotina gerada:\n${routine}`);
    console.log(`📩 Resposta gerada:\n${response}`);

    // 📤 Enviar a rotina gerada primeiro
     
    console.log(`✅ Rotina enviada para ${senderId}`);

    // 📤 Enviar a resposta baseada na rotina
    await sendBotMessage(senderId, `${response}`);
    console.log(`✅ Resposta enviada para ${senderId}`);
  } catch (error) {
    console.error("❌ Erro ao processar e enviar mensagem:", error);
  }
};

/**
 * 📤 Envia mensagem do bot via API
 */
const sendBotMessage = async (recipientId, content) => {
  try {
    console.log(`📤 Tentando enviar mensagem para ${recipientId}:`, content);

    const response = await axios.post(
      API_URL,
      {
        phone: recipientId,
        message: content,
        delayMessage: 3, // Adiciona um pequeno atraso para melhor experiência
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );    

    return response.data;
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem:", error.response?.data || error.message);
  }
};

module.exports = { processAndSendMessage, sendBotMessage };
