// services/kommo/pipelineBoleto.js

const axios = require('axios');
require('dotenv').config();
const { normalizePhone } = require('../normalizePhone');

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const PIPELINE_ID = 7214739; // COMERCIAL VERTEX
const STAGE_ID_BOLETO = 74576504; // Boleto

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

  const contact = res.data._embedded?.contacts?.[0];

  if (!contact) {
    console.log("❌ Nenhum contato encontrado com esse número.");
    return null;
  }

  const lead = contact._embedded?.leads?.[0] || null;

  return { contact, lead };
}

/**
 * Cria novo lead no estágio "Boleto"
 */
async function createBoletoLead(contactId, name) {
  const payload = [
    {
      name: `Lead Boleto - ${name}`,
      status_id: STAGE_ID_BOLETO,
      pipeline_id: PIPELINE_ID,
      _embedded: { contacts: [{ id: contactId }] }
    }
  ];

  const res = await axios.post(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  const leadId = res.data._embedded?.leads?.[0]?.id;

  console.log("🆕 Novo lead criado no estágio 'Boleto':", leadId);
  return leadId;
}

/**
 * Move lead existente para o estágio "Boleto"
 */
async function moveLeadToBoleto(leadId) {
  const payload = [
    {
      id: leadId,
      pipeline_id: PIPELINE_ID,
      status_id: STAGE_ID_BOLETO
    }
  ];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`📆 Lead ${leadId} movido para estágio 'Boleto'`);
}

/**
 * Serviço principal: Garante que o contato tenha um lead no estágio 'Boleto'
 */
async function pipelineBoleto({ name, phone }) {
  const result = await findContactAndLeadByPhone(phone);
  if (!result || !result.contact) throw new Error("❌ Contato não encontrado");

  const contactId = result.contact.id;

  if (!result.lead) {
    await createBoletoLead(contactId, name);
    return;
  }

  const lead = result.lead;
  const alreadyInBoleto =
    lead.pipeline_id === PIPELINE_ID &&
    lead.status_id === STAGE_ID_BOLETO;

  if (!alreadyInBoleto) {
    await moveLeadToBoleto(lead.id);
  } else {
    console.log("✅ Lead já está no estágio 'Boleto'.");
  }
}

module.exports = { pipelineBoleto };
