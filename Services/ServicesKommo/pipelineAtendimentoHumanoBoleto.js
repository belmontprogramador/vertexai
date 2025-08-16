const axios = require("axios");
require("dotenv").config();
const { normalizePhone } = require("../normalizePhone");

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

// 📌 Pipeline e estágio para "Atendimento Humano Boleto"
const PIPELINE_ID = 7471539; // NOVO COMERCIAL VERTEX
const STAGE_ID = 89544588;   // Atendimento Humano Boleto

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

// 🔍 Busca contato e primeiro lead ativo
async function findContactAndLeadByPhone(phone) {
  const telefoneComMais = phone.startsWith("+") ? phone : `+${normalizePhone(phone)}`;
  const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts`, {
    headers,
    params: { query: telefoneComMais, with: "leads" },
  });

  const contact = res.data._embedded?.contacts?.[0];
  if (!contact) throw new Error("❌ Contato não encontrado.");

  const leads = contact._embedded?.leads || [];

  for (const l of leads) {
    const leadDetail = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads/${l.id}`, { headers });
    const leadData = leadDetail.data;

    if (!leadData.is_deleted && leadData.status_id) {
      return { contact, lead: { id: leadData.id, pipeline_id: leadData.pipeline_id, status_id: leadData.status_id } };
    }
  }

  throw new Error("❌ Nenhum lead ativo encontrado para esse contato.");
}

// 🔁 Atualiza lead para o estágio "Atendimento Humano Boleto"
async function updateLeadToAtendimentoHumanoBoleto(leadId) {
  const payload = [
    {
      id: leadId,
      pipeline_id: PIPELINE_ID,
      status_id: STAGE_ID,
    },
  ];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`🔁 Lead ${leadId} movido para 'Atendimento Humano Boleto' no pipeline 'NOVO COMERCIAL VERTEX'`);
}

// 🚀 Função principal
async function pipelineAtendimentoHumanoBoleto(phone) {
  const { lead } = await findContactAndLeadByPhone(phone);

  if (lead.status_id === STAGE_ID && lead.pipeline_id === PIPELINE_ID) {
    console.log("✅ Lead já está em 'Atendimento Humano Boleto'.");
    return;
  }

  await updateLeadToAtendimentoHumanoBoleto(lead.id);
}

module.exports = { pipelineAtendimentoHumanoBoleto };
