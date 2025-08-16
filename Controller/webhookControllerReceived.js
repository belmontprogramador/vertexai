// 📁 Controller/webhookControllerReceived.js

const { checagemInicial } = require("../Services/checagemInicial");
const { agenteDeTranscricao } = require("../Services/agenteDeTranscricao");
const {
  isBotPausado,
  setPrimeiraInteracao,
  getPrimeiraInteracao,
  getUserStage,
  isBotPausadoParaUsuario,
  pausarBotParaUsuario,
  setLastInteraction, // 👈 importado para salvar a última interação
} = require("../Services/redisService");
const { DateTime } = require("luxon");
const { sendBotMessage } = require("../Services/messageSender");
const { extrairTextoDoQuotedMessage } = require("../Services/utils/utilitariosDeMensagem/extrairTextoDoQuotedMessage");
const {
  estaBloqueado,
  enfileirarMensagem,
  setBloqueioComFila,
  injectProcessor
} = require("../Services/utils/filaDeMensagem/bloqueioTemporarioLiberado");
const { obterTempoDeBloqueio } = require("../Services/utils/filaDeMensagem/tempoDeBloqueioPorStage");
const { getUserStageApiOficial } = require("../Services/redisService");
const { pipelineAtendimentoHumanoBoleto } = require("../Services/ServicesKommo/pipelineAtendimentoHumanoBoleto");

// 🧠 Injeção da função para processar mensagens enfileiradas
injectProcessor(async (sender, content, messageId, quotedMessage, pushName) => {
  console.log(`📦 Reprocessando mensagem da fila para ${sender}:`, content);
  await checagemInicial(sender, content, pushName, messageId, quotedMessage);
});

const webhookControllerReceived = async (req, res) => {
  try {
    console.log("📥 Webhook recebido");
    // console.log(JSON.stringify(req.body, null, 2))

    const chatId = req.body?.chat?.id || "";
    if (chatId.includes("@g.us")) {
      console.log(`👥 Mensagem de grupo ignorada (${chatId})`);
      return res.status(200).json({ message: "Mensagem de grupo ignorada." });
    }

    const { messageId, sender, msgContent } = req.body;
    const pushName = sender?.pushName || "";
    const normalizarSenderId = (id) => id?.split("@")[0]; // remove "@c.us"
    const senderId = normalizarSenderId(sender?.id);

    // const stageApiOficial = await getUserStageApiOficial(senderId);
    // if (stageApiOficial) {
    //   console.log(`🚫 Ignorado: ${senderId} está em fluxo da API oficial (stage: ${stageApiOficial}).`);
    //   return res.status(200).json({ message: "Ignorado na não-oficial por estar em fluxo da API oficial." });
    // }

    if (!messageId || !senderId) {
      console.log("🚨 Mensagem inválida.");
      return res.status(400).json({ error: "Mensagem inválida." });
    }

    // 🕒 ✅ Registra a última interação imediatamente para qualquer mensagem válida
    try {
      await setLastInteraction(senderId);
      console.log(`🕒 Última interação atualizada para ${senderId} = ${Date.now()}`);
    } catch (e) {
      console.warn(`⚠️ Falha ao gravar última interação de ${senderId}: ${e.message}`);
    }

    if (await isBotPausadoParaUsuario(senderId)) {
      console.log(`⏸️ Bot pausado para ${senderId}.`);
      return res.status(200).json({ message: "Bot pausado para este usuário." });
    }

    const content =
      msgContent?.conversation?.trim() ||
      msgContent?.extendedTextMessage?.text?.trim();

    const comandoCliente = content?.toLowerCase()?.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (comandoCliente === "ola quero saber mais sobre aprovacao do boleto") {
      console.log(`📨 Palavra-chave de aprovação do boleto detectada para ${senderId}`);

      try {
        await pausarBotParaUsuario(senderId);
        console.log(`⏸️ Bot pausado individualmente para ${senderId}`);
      } catch (err) {
        console.warn(`⚠️ Erro ao pausar bot para ${senderId}:`, err.message);
      }

      try {
        await pipelineAtendimentoHumanoBoleto(senderId);
        console.log("✅ Lead movido para Atendimento Humano Boleto com sucesso.");
      } catch (err) {
        console.error("❌ Erro ao mover para Atendimento Humano Boleto:", err.message);
      }

      return res.status(200).json({ message: "Movimentação de boleto processada com sucesso." });
    }

    // Ignora áudios (desativado, pode reativar se quiser)
    const isAudio = msgContent?.audioMessage;
    if (isAudio) {
      await sendBotMessage(senderId, "No momento não estamos ouvindo áudio, pode digitar por favor?");
      return res.status(200).json({ message: "Áudio ignorado." });
    }

    await setPrimeiraInteracao(senderId);
    const timestamp = await getPrimeiraInteracao(senderId);
    const dataFormatada = DateTime.fromMillis(timestamp)
      .setZone("America/Sao_Paulo")
      .toFormat("dd/MM/yyyy HH:mm:ss");

    console.log(`📅 Primeira interação de ${senderId}: ${dataFormatada}`);

    const DATA_LIMITE = DateTime.fromISO("2025-07-09T11:41:00", {
      zone: "America/Sao_Paulo",
    }).toMillis();

    if (timestamp < DATA_LIMITE) {
      console.log("⏳ Ignorado por ser anterior à data limite.");
      return res.status(200).json({ message: "Interação antiga ignorada." });
    }

    // if (!content || !content.toLowerCase().startsWith("again")) {
    //   console.log("⚠️ Mensagem ignorada (sem 'again').");
    //   return res.status(200).json({ message: "Mensagem irrelevante ignorada." });
    // }

    const quotedMessage = extrairTextoDoQuotedMessage(msgContent);

    if (await estaBloqueado(senderId)) {
      console.log("🛑 Usuário bloqueado, enfileirando mensagem...");
      await enfileirarMensagem(senderId, {
        content,
        pushName,
        messageId,
        quotedMessage
      });
      return res.status(200).json({ message: "Mensagem enfileirada." });
    }

    const stageAtual = await getUserStage(senderId);
    const tempoBloqueio = obterTempoDeBloqueio(stageAtual);
    console.log(`⏱️ Tempo de bloqueio para o stage "${stageAtual}": ${tempoBloqueio}s`);

    await setBloqueioComFila(senderId, tempoBloqueio);
    // Enfileira imediatamente e inicia o bloqueio temporário
    await enfileirarMensagem(senderId, {
      content,
      pushName,
      messageId,
      quotedMessage
    });

    return res.json({ message: "Mensagem processada com sucesso!" });

  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    return res.status(500).json({ error: "Erro ao processar mensagem." });
  }
};

module.exports = { webhookControllerReceived };
