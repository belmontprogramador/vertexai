const axios = require('axios');
require('dotenv').config();

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  'Content-Type': 'application/json'
};

/**
 * Busca pipeline "COMERCIAL VERTEX" e estágio "Contato Inicial"
 */
async function getComercialVertexPipeline() {
  const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads/pipelines`, { headers });
  const pipelines = res.data._embedded?.pipelines || [];
  const pipeline = pipelines.find(p => p.name === "COMERCIAL VERTEX");

  if (!pipeline) throw new Error("❌ Pipeline 'COMERCIAL VERTEX' não encontrado.");
  const contatoInicialStage = pipeline.statuses.find(s => s.name === "Contato Inicial");

  if (!contatoInicialStage) throw new Error("❌ Estágio 'Contato Inicial' não encontrado.");

  return { pipelineId: pipeline.id, stageId: contatoInicialStage.id };
}

/**
 * Busca contato pelo telefone
 */
async function findContactByPhone(phone) {
  const response = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts`, {
    headers,
    params: { query: phone }
  });

  const contatos = response.data?._embedded?.contacts || [];
  return contatos.length ? contatos[0] : null;
}

/**
 * Move um lead para o pipeline e estágio corretos
 */
async function moveLeadToContatoInicial(leadId, pipelineId, stageId) {
  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, [{
    id: leadId,
    pipeline_id: pipelineId,
    status_id: stageId
  }], { headers });

  console.log(`📦 Lead ${leadId} movido para pipeline '${pipelineId}' e estágio 'Contato Inicial'`);
}

/**
 * Cria novo lead vinculado a um contato existente
 */
async function createLeadForContact(contactId, name, pipelineId, stageId) {
  const leadData = [{
    name,
    status_id: stageId,
    pipeline_id: pipelineId,
    _embedded: {
      contacts: [{ id: contactId }]
    }
  }];

  const res = await axios.post(`${KOMMO_BASE_URL}/api/v4/leads`, leadData, { headers });
  const leadId = res.data._embedded?.leads?.[0]?.id;
  console.log("🆕 Lead criado para contato existente:", leadId);
  return leadId;
}

/**
 * Cria contato + lead novo
 */
async function createContactAndLead({ name, phone, firstName, pipelineId, stageId }) {
  const leadData = [{
    name,
    status_id: stageId,
    pipeline_id: pipelineId,
    _embedded: {
      contacts: [{
        first_name: firstName,
        custom_fields_values: [{
          field_code: "PHONE",
          values: [{ value: phone, enum_code: "WORK" }]
        }]
      }]
    }
  }];

  const res = await axios.post(`${KOMMO_BASE_URL}/api/v4/leads`, leadData, { headers });

  const leadId = res.data._embedded?.leads?.[0]?.id;
  const contactId = res.data._embedded?.contacts?.[0]?.id;

  console.log("✅ Contato e lead criados:", { leadId, contactId });
  return { leadId, contactId };
}

/**
 * Função principal que gerencia a lógica de lead no estágio "Contato Inicial"
 */
async function pipelineContatoInicial({ name, phone, firstName }) {
  const { pipelineId, stageId } = await getComercialVertexPipeline();
  const contact = await findContactByPhone(phone);

  if (!contact) {
    return await createContactAndLead({ name, phone, firstName, pipelineId, stageId });
  }

  const contactId = contact.id;
  const leads = contact._embedded?.leads || [];

  if (leads.length === 0) {
    // Sem leads: cria novo
    const leadId = await createLeadForContact(contactId, name, pipelineId, stageId);
    return { leadId, contactId };
  }

  const lead = leads[0];

  // Qualquer lead existente (mesmo fora do pipeline): move para COMERCIAL VERTEX / Contato Inicial
  await moveLeadToContatoInicial(lead.id, pipelineId, stageId);
  return { leadId: lead.id, contactId };
}

module.exports = { pipelineContatoInicial };
