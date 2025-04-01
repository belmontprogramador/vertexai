const axios = require('axios');
require('dotenv').config();
const { normalizePhone } = require('../normalizePhone');

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const PIPELINE_ID = 7214739; // COMERCIAL VERTEX
const STAGE_ID_CONTATO_INICIAL = 59717047; // Contato Inicial

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  'Content-Type': 'application/json'
};

/**
 * Busca contato pelo telefone normalizado e retorna também o lead (se houver)
 */
async function findContactAndLeadByPhone(phone) {
  const normalized = normalizePhone(phone);
  console.log("📞 Número normalizado:", normalized);

  const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts`, {
    headers,
    params: { query: normalized, with: 'leads' }
  });

  console.log("📦 Resposta da API Kommo (contacts):", JSON.stringify(res.data, null, 2));

  const contact = res.data._embedded?.contacts?.[0];

  if (!contact) {
    console.log("❌ Nenhum contato encontrado com esse número.");
    return null;
  }

  console.log("✅ Contato encontrado:", {
    id: contact.id,
    name: contact.name,
    phones: contact.custom_fields_values?.find(f => f.field_code === 'PHONE')?.values || []
  });

  const lead = contact._embedded?.leads?.[0] || null;

  if (!lead) {
    console.log("ℹ️ Contato encontrado, mas sem leads vinculados.");
  } else {
    console.log("✅ Lead vinculado encontrado:", {
      id: lead.id,
      status_id: lead.status_id,
      pipeline_id: lead.pipeline_id
    });
  }

  return { contact, lead };
}


/**
 * Cria novo lead vinculado a um contato existente
 */
async function createLeadForContact(contactId, name) {
  const payload = [{
    name,
    status_id: STAGE_ID_CONTATO_INICIAL,
    pipeline_id: PIPELINE_ID,
    _embedded: { contacts: [{ id: contactId }] }
  }];

  const res = await axios.post(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  const leadId = res.data._embedded?.leads?.[0]?.id;

  console.log("🆕 Lead criado para contato existente:", leadId);
  return leadId;
}

/**
 * Move um lead para o estágio "Contato Inicial"
 */
async function moveLeadToContatoInicial(leadId) {
  const payload = [{
    id: leadId,
    pipeline_id: PIPELINE_ID,
    status_id: STAGE_ID_CONTATO_INICIAL
  }];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`📦 Lead ${leadId} movido para 'Contato Inicial'`);
}

/**
 * Função principal
 */
async function pipelineContatoInicial({ name, phone }) {
  const result = await findContactAndLeadByPhone(phone);
  if (!result || !result.contact) throw new Error("❌ Contato não encontrado");

  const contactId = result.contact.id;

  if (!result.lead) {
    await createLeadForContact(contactId, name);
    return;
  }

  const lead = result.lead;

  const alreadyInContatoInicial =
    lead.pipeline_id === PIPELINE_ID &&
    lead.status_id === STAGE_ID_CONTATO_INICIAL;

  if (!alreadyInContatoInicial) {
    await moveLeadToContatoInicial(lead.id);
  } else {
    console.log("✅ Lead já está em 'Contato Inicial'. Nenhuma ação necessária.");
  }
}

module.exports = { pipelineContatoInicial };
