const axios = require('axios');
require('dotenv').config();

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

// Pipeline e estágio alvo
const PIPELINE_ID = 7214739; // COMERCIAL VERTEX
const STAGE_ID_NEGOCIANDO = 60589215; // NEGOCIANDO

// Headers para autenticação
const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  'Content-Type': 'application/json'
};

// Busca o lead ativo dentro do pipeline COMERCIAL VERTEX
async function findContactAndLeadByPhone(phone) {
  const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts`, {
    headers,
    params: {
      query: phone,
      with: 'leads'
    }
  });

  const contact = res.data._embedded?.contacts?.[0];

  if (!contact) throw new Error("❌ Contato não encontrado.");

  const leads = contact._embedded?.leads || [];

  let detailedLead = null;

  for (const l of leads) {
    const leadDetail = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads/${l.id}`, { headers });
    const leadData = leadDetail.data;

    if (leadData.pipeline_id === PIPELINE_ID) {
      detailedLead = {
        id: leadData.id,
        status_id: leadData.status_id,
        pipeline_id: leadData.pipeline_id
      };
      break;
    }
  }

  return { contact, lead: detailedLead };
}

// Atualiza o estágio do lead para "NEGOCIANDO"
async function updateLeadToNegociando(leadId) {
  const payload = [
    {
      id: leadId,
      pipeline_id: PIPELINE_ID,
      status_id: STAGE_ID_NEGOCIANDO
    }
  ];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`📦 Lead ${leadId} movido para o estágio 'NEGOCIANDO'`);
}

// Função principal que será exportada
async function pipelineNegociando(phone) {
  const telefoneComMais = phone.startsWith('+') ? phone : `+${phone}`;

  const { contact, lead } = await findContactAndLeadByPhone(telefoneComMais);

  if (!lead) {
    throw new Error("❌ Nenhum lead encontrado no pipeline COMERCIAL VERTEX.");
  }

  if (lead.status_id === STAGE_ID_NEGOCIANDO) {
    console.log("✅ Lead já está em 'NEGOCIANDO'.");
    return;
  }

  await updateLeadToNegociando(lead.id);
}

module.exports = { pipelineNegociando };
