const axios = require('axios');
require('dotenv').config();

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const PIPELINE_ID = 7214739; // COMERCIAL VERTEX
const STAGE_ID_BOLETO = 74576504; // BOLETO

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  'Content-Type': 'application/json'
};

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

async function updateLeadToBoleto(leadId) {
  const payload = [
    {
      id: leadId,
      pipeline_id: PIPELINE_ID,
      status_id: STAGE_ID_BOLETO
    }
  ];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`📦 Lead ${leadId} movido para o estágio 'BOLETO'`);
}

async function pipelineBoleto(phone) {
  const telefoneComMais = phone.startsWith('+') ? phone : `+${phone}`;

  const { contact, lead } = await findContactAndLeadByPhone(telefoneComMais);

  if (!lead) throw new Error("❌ Nenhum lead encontrado no pipeline COMERCIAL VERTEX.");

  if (lead.status_id === STAGE_ID_BOLETO) {
    console.log("✅ Lead já está no estágio 'BOLETO'.");
    return;
  }

  await updateLeadToBoleto(lead.id);
}

module.exports = { pipelineBoleto };
