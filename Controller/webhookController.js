require("dotenv").config();
const { checagemInicialApi } = require("../ServicesApiOficial/checagemInicialApi");
const {
  getUserStageApiOficial,
} = require("../Services/redisService");
const redis = require("../Services/redisService").redis;

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// 📡 Verificação inicial do webhook (usado apenas na configuração do Meta)
exports.verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("🔗 Webhook verificado com sucesso!");
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
};

// 📥 Processamento de mensagens da API Oficial
exports.receiveWebhook = async (req, res) => {
  const body = req.body;

  if (body.object === "whatsapp_business_account") {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;

        // 📨 Mensagens recebidas de clientes
        if (value.messages) {
          for (const message of value.messages) {
            const sender = message.from;
            const pushName = value.contacts?.[0]?.profile?.name;
            const msgContent = message.text?.body;
            const messageId = message.id;
            const quotedMessage = message.context?.quoted_message || null;

            console.log("📩 Mensagem recebida via API oficial:");
            console.log("📱 De:", sender);
            console.log("🧑 Nome:", pushName);
            console.log("💬 Texto:", msgContent || "[não textual]");
            console.log("🔁 Citada?:", quotedMessage ? "Sim" : "Não");
            console.log("----------------------------------");

            // 🚫 Verifica se o bot está pausado para o cliente
            const estaPausado = await redis.get(`bot:pausado:${sender}`);
            if (estaPausado) {
              console.log(`🤖 Bot está pausado para ${sender}. Ignorando mensagem.`);
              continue; // pula para a próxima mensagem
            }

            // ✅ Seta a origem como API oficial por 1 hora
            await redis.set(`origem_fluxo:${sender}`, "oficial");

            try {
              await checagemInicialApi(sender, msgContent, pushName, messageId, quotedMessage);
            } catch (err) {
              console.error("❌ Erro na checagemInicialApi:", err);
            }
          }
        }

        // 📤 Status da mensagem (entregue, lida etc.)
        if (value.statuses) {
          for (const status of value.statuses) {
            console.log("📬 STATUS DE MENSAGEM");
            console.log("🆔 ID:", status.id);
            console.log("📞 Para:", status.recipient_id);
            console.log("✅ Status:", status.status);
            console.log("🕒 Timestamp:", status.timestamp);
            console.log("🎯 Origem:", status.conversation?.origin?.type);
            console.log("----------------------------------");
          }
        }
      }
    }

    return res.sendStatus(200);
  }

  return res.sendStatus(404);
};
