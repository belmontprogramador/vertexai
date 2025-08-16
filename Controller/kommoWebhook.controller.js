const axios = require("axios");
const { sendBotMessage } = require("../Services/messageSender");

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;
const TELEFONE_DESTINO_FIXO = "+5522991059167";

async function webhookKommoSalesbot(req, res) {
  try {
    const payload = req.body;

    // 🔍 ID do lead capturado no webhook
    const leadId = payload?.leads?.add?.[0]?.id;
    if (!leadId) {
      console.warn("⚠️ Lead ID não encontrado no webhook.");
      return res.status(400).json({ error: "Lead ID não encontrado" });
    }

    // 📦 Busca o lead com contatos vinculados
    const leadResponse = await axios.get(
      `${KOMMO_BASE_URL}/api/v4/leads/${leadId}?with=contacts`,
      {
        headers: {
          Authorization: `Bearer ${KOMMO_TOKEN}`,
          "Content-Type": "application/json",
        }
      }
    );

    const leadData = leadResponse.data;
    const leadName = leadData.name || "sem nome"; // 🟢 Nome correto (ex: Felipe)
    const contact = leadData._embedded?.contacts?.[0];

    if (!contact?.id) {
      console.warn("⚠️ Contato não encontrado no lead.");
      return res.status(404).json({ error: "Contato não encontrado" });
    }

    const contactId = contact.id;

    // 📞 Busca os dados completos do contato
    const contactResponse = await axios.get(
      `${KOMMO_BASE_URL}/api/v4/contacts/${contactId}?with=leads`,
      {
        headers: {
          Authorization: `Bearer ${KOMMO_TOKEN}`,
          "Content-Type": "application/json",
        }
      }
    );

    const contactData = contactResponse.data;
    const telefone = contactData.custom_fields_values?.find(c =>
      (c.field_name || "").toLowerCase().includes("telefone") ||
      (c.name || "").toLowerCase().includes("telefone")
    )?.values?.[0]?.value || "não informado";

    const camposCustomizados = contactData.custom_fields_values || [];
    const camposFormatados = camposCustomizados.map(campo => {
      const nomeCampo = campo.field_name || campo.name || "Sem nome";
      const valorCampo = campo.values?.[0]?.value || "sem valor";
      return `- ${nomeCampo}: ${valorCampo}`;
    }).join("\n") || "nenhum";

    const leadVinculado = contactData._embedded?.leads?.[0];
    const leadVinculadoId = leadVinculado?.id || leadId;

    // 📤 Mensagem final
    const texto = `Anna por aqui! Pescamos um lead no remarketing 🙌

📛 Nome do lead: ${leadName} 
🆔 Lead ID: ${leadVinculadoId}
Telefone de Contato: ${camposFormatados}`;

    await sendBotMessage(TELEFONE_DESTINO_FIXO, texto);
    console.log(`✅ Mensagem enviada para ${TELEFONE_DESTINO_FIXO}:\n${texto}`);

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("❌ Erro no webhookKommoSalesbot:", err.message);
    return res.status(500).json({ error: "Erro interno" });
  }
}

module.exports = { webhookKommoSalesbot };
