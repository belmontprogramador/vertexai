// 📁 Controller/webhookControllerReceived.js
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { checagemInicial } = require("../Services/checagemInicial");
const { agenteDeTranscricao } = require("../Services/agenteDeTranscricao");
const { isBotPausado, setPrimeiraInteracao, getPrimeiraInteracao } = require("../Services/redisService");
const { DateTime } = require("luxon");
const {sendBotMessage} = require('../Services/messageSender')
const { extrairTextoDoQuotedMessage } = require("../Services/utils/extrairTextoDoQuotedMessage"); 

const webhookControllerReceived = async (req, res) => {
  try {
    console.log("📥 Webhook recebido:");
// console.dir(req.body, { depth: null });
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

    // const isAudio = msgContent?.audioMessage;
    

    //   if (isAudio) {
    //     console.log("🎧 Áudio recebido! Ignorando e pedindo texto...");
      
    //     await sendBotMessage(senderId, "No momento não estamos ouvindo áudio, pode digitar por favor?");
    //     return res.status(200).json({
    //       message: "No momento não estamos ouvindo áudio, pode digitar por favor?",
    //     });
    //   }
      

    // 🧾 Garante que a primeira interação seja registrada SEMPRE
    await setPrimeiraInteracao(senderId);
    const timestamp = await getPrimeiraInteracao(senderId);
    const dataFormatada = DateTime.fromMillis(timestamp)
      .setZone("America/Sao_Paulo")
      .toFormat("dd/MM/yyyy HH:mm:ss");

    console.log(`📅 Primeira interação registrada de ${senderId} em: ${dataFormatada}`);

    const DATA_LIMITE = DateTime.fromISO("2025-06-04T09:52:00", {
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

     

    const quotedMessage = extrairTextoDoQuotedMessage(msgContent);
    if (quotedMessage) {
      console.log("📎 Mensagem citada capturada dentro do controller:", quotedMessage);
    }
    


    console.log("🧠 Conteúdo pronto para checagem:", content);
    await checagemInicial(senderId, content, pushName, messageId, quotedMessage);

    return res.json({ message: "Mensagem processada com sucesso!" });

  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    return res.status(500).json({ error: "Erro no processamento da mensagem." });
  }
};

module.exports = { webhookControllerReceived };