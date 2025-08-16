// controllers/whatsappController.js
const axios = require("axios");
require("dotenv").config();

const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = "768208863033397";
const TEMPLATE_NAME = "enviar_nota_fiscal";

async function enviarNotaFiscalTemplate(req, res) {
  try {
    // 🔍 Log do payload recebido do Kommo
    console.log("📦 Payload recebido do Kommo:");
    console.dir(req.body, { depth: null });

    const contato = req.body.contact || {};
    const numero = contato.phone;
    const nome = contato.name;

    if (!numero || !nome) {
      console.warn("⚠️ Payload não contém 'contact.phone' ou 'contact.name'");
      return res.status(400).json({ erro: "Contato inválido. Número e nome são obrigatórios." });
    }

    const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: numero,
      type: "template",
      template: {
        name: TEMPLATE_NAME,
        language: {
          code: "pt_BR"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: nome
              }
            ]
          }
        ]
      }
    };

    const resposta = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    // ✅ Log de sucesso
    console.log(`✅ Template '${TEMPLATE_NAME}' enviado com sucesso para ${numero}`);
    console.dir(resposta.data, { depth: null });

    return res.status(200).json({ status: "✅ Template enviado com sucesso", whatsappResponse: resposta.data });

  } catch (error) {
    console.error("❌ Erro ao enviar template:", error.response?.data || error.message);
    return res.status(500).json({
      erro: "❌ Falha ao enviar template",
      detalhe: error.response?.data || error.message
    });
  }
}

module.exports = {
  enviarNotaFiscalTemplate
};
