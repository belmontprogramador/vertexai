const axios = require("axios");
require("dotenv").config();
const { normalizePhone } = require("../normalizePhone");

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const PIPELINE_ACESSORIOS_ID = 7473303; // Pipeline Acessórios
const STAGE_ID_CONTATO_INICIAL = 61185911; // Contato Inicial do Pipeline de Acessórios

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json"
};

async function findContactAndLeadByPhone(phone) {
  const normalized = normalizePhone(phone);
  const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts`, {
    headers,
    params: { query: normalized, with: "leads" }
  });

  const contact = res.data._embedded?.contacts?.[0];
  if (!contact) return null;

  const lead = contact._embedded?.leads?.find(
    (l) => l.pipeline_id === PIPELINE_ACESSORIOS_ID
  );

  return { contact, lead };
}

async function createLeadForContact(contactId, name) {
  const payload = [
    {
      name,
      status_id: STAGE_ID_CONTATO_INICIAL,
      pipeline_id: PIPELINE_ACESSORIOS_ID,
      _embedded: { contacts: [{ id: contactId }] }
    }
  ];

  const res = await axios.post(`${KOMMO_BASE_URL}/api/v4/leads`, payload, {
    headers
  });
  const leadId = res.data._embedded?.leads?.[0]?.id;

  console.log("🆕 Lead criado para contato no pipeline de Acessórios:", leadId);
  return leadId;
}

async function moveLeadToContatoInicial(leadId) {
  const payload = [
    {
      id: leadId,
      pipeline_id: PIPELINE_ACESSORIOS_ID,
      status_id: STAGE_ID_CONTATO_INICIAL
    }
  ];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`📦 Lead ${leadId} movido para 'Contato Inicial' do pipeline de Acessórios`);
}

async function pipelineContatoInicialAcessorios({ name, phone }) {
  const result = await findContactAndLeadByPhone(phone);
  if (!result || !result.contact) throw new Error("❌ Contato não encontrado");

  const contactId = result.contact.id;

  if (!result.lead) {
    await createLeadForContact(contactId, name);
    return;
  }

  const alreadyInContatoInicial =
    result.lead.pipeline_id === PIPELINE_ACESSORIOS_ID &&
    result.lead.status_id === STAGE_ID_CONTATO_INICIAL;

  if (!alreadyInContatoInicial) {
    await moveLeadToContatoInicial(result.lead.id);
  } else {
    console.log("✅ Lead já está em 'Contato Inicial' no pipeline de Acessórios. Nenhuma ação necessária.");
  }
}

module.exports = { pipelineContatoInicialAcessorios };
