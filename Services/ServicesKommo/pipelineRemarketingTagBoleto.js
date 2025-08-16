const axios = require("axios");
require("dotenv").config();
const { normalizePhone } = require("../normalizePhone");

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const PIPELINE_ID = 7471539; // NOVO COMERCIAL VERTEX
const STAGE_ID_REMARKETING_TAG = 88879068; // REMARKETING TAG

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

// Busca o contato e retorna o primeiro lead ativo com a tag "boletopipeline"
// e que NÃO tenha as tags "TarefaAgendada" ou "ReaquecimentoLead"
async function findContactAndLeadWithBoletoTag(phone) {
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

  for (const lead of leads) {
    const { data: leadData } = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads/${lead.id}`, { headers });

    const isAtivo = !leadData.is_deleted;
    const tags = leadData._embedded?.tags || [];
    const tagNames = tags.map(tag => tag.name);

    const hasBoletoTag = tagNames.includes("boletopipeline");
    const hasBlockedTag = tagNames.includes("TarefaAgendada") || tagNames.includes("ReaquecimentoLead");

    if (isAtivo && hasBoletoTag && !hasBlockedTag) {
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


// Atualiza o lead para o estágio "REMARKETING TAG"
async function updateLeadToRemarketingTag(leadId) {
  const payload = [
    {
      id: leadId,
      pipeline_id: PIPELINE_ID,
      status_id: STAGE_ID_REMARKETING_TAG,
    },
  ];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`🏷️ Lead ${leadId} movido para 'REMARKETING TAG' no pipeline 'NOVO COMERCIAL VERTEX'`);
}

// Função principal que executa o fluxo
async function pipelineRemarketingTagBoleto(phone) {
  const { contact, lead } = await findContactAndLeadWithBoletoTag(phone);

  if (!lead) {
    throw new Error("❌ Nenhum lead ativo com tag 'boletopipeline' encontrado para este contato.");
  }

  if (lead.status_id === STAGE_ID_REMARKETING_TAG && lead.pipeline_id === PIPELINE_ID) {
    console.log("✅ Lead já está em 'REMARKETING TAG'.");
    return;
  }

  await updateLeadToRemarketingTag(lead.id);
}

module.exports = { pipelineRemarketingTagBoleto };
