const axios = require("axios");
require("dotenv").config();
const { normalizePhone } = require("../normalizePhone");

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const PIPELINE_ID = 7471539; // NOVO COMERCIAL VERTEX
const STAGE_ID_REMARKETING = 88879064; // REMARKETING

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

 
async function findContactAndLeadByPhone(phone) {
  const telefoneComMais = phone.startsWith("+") ? phone : `+${normalizePhone(phone)}`;
  const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts`, {
    headers,
    params: {
      query: telefoneComMais,
      with: "leads",
    },
  });

  const contact = res.data._embedded?.contacts?.[0];
  if (!contact) throw new Error("❌ Contato não encontrado.");

  const leads = contact._embedded?.leads || [];

  for (const l of leads) {
    const { data: leadData } = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads/${l.id}`, { headers });

    const tags = leadData._embedded?.tags || [];
    const tagNames = tags.map(tag => tag.name);

    const hasBlockedTag = tagNames.includes("boletopipeline") || tagNames.includes("TarefaAgendada") || tagNames.includes("ReaquecimentoLead");
    const isAtivo = !leadData.is_deleted;

    if (!hasBlockedTag && isAtivo) {
      return {
        contact,
        lead: {
          id: leadData.id,
          status_id: leadData.status_id,
          pipeline_id: leadData.pipeline_id,
        },
      };
    }
  }

  return { contact, lead: null };
}



// Atualiza o lead para o estágio REMARKETING no pipeline "NOVO COMERCIAL VERTEX"
async function updateLeadToRemarketing(leadId) {
  const payload = [
    {
      id: leadId,
      pipeline_id: PIPELINE_ID,
      status_id: STAGE_ID_REMARKETING,
    },
  ];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`🔁 Lead ${leadId} movido para 'REMARKETING' no pipeline 'NOVO COMERCIAL VERTEX'`);
}

// Função principal de movimentação
async function pipelineRemarketing(phone) {
  const { contact, lead } = await findContactAndLeadByPhone(phone);

  if (!lead) {
    throw new Error("❌ Nenhum lead elegível (sem tag 'boletopipeline') encontrado para este contato.");
  }

  if (lead.status_id === STAGE_ID_REMARKETING && lead.pipeline_id === PIPELINE_ID) {
    console.log("✅ Lead já está em 'REMARKETING'.");
    return;
  }

  await updateLeadToRemarketing(lead.id);
}

module.exports = { pipelineRemarketing };
