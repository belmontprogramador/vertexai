const axios = require("axios");
require("dotenv").config();
const { normalizePhone } = require("../normalizePhone");

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const PIPELINE_ID = 7471539; // NOVO COMERCIAL VERTEX
const STAGE_ID_ATENDIMENTO_HUMANO = 61175951; // ATENDIMENTO hUMANO

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

// Busca o contato e o primeiro lead ativo (de qualquer pipeline)
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

// Atualiza o lead para o estágio ATENDIMENTO hUMANO no pipeline novo
async function updateLeadToAtendimentoHumano(leadId) {
  const payload = [
    {
      id: leadId,
      pipeline_id: PIPELINE_ID,
      status_id: STAGE_ID_ATENDIMENTO_HUMANO,
    },
  ];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`🔁 Lead ${leadId} movido para 'ATENDIMENTO hUMANO' no pipeline 'NOVO COMERCIAL VERTEX'`);
}

// Função principal de movimentação
async function pipelineAtendimentoHumano(phone) {
  const { lead } = await findContactAndLeadByPhone(phone);

  if (lead.status_id === STAGE_ID_ATENDIMENTO_HUMANO && lead.pipeline_id === PIPELINE_ID) {
    console.log("✅ Lead já está em 'ATENDIMENTO hUMANO'.");
    return;
  }

  await updateLeadToAtendimentoHumano(lead.id);
}

module.exports = { pipelineAtendimentoHumano };
