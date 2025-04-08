const axios = require("axios");
require("dotenv").config();
const { normalizePhone } = require("../normalizePhone");

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const PIPELINE_ACESSORIOS_ID = 7473303;
const STAGE_ID_CONTATO_INICIAL = 61185911;

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

/**
 * Consulta um contato na Kommo pelo telefone, retornando o contato e todos os leads vinculados.
 */
async function findContactAndLeads(phone) {
  const normalized = normalizePhone(phone);
  const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts`, {
    headers,
    params: { query: normalized, with: "leads" },
  });

  const contact = res.data._embedded?.contacts?.[0];
  if (!contact) return null;

  const leads = contact._embedded?.leads || [];

  console.log(`📞 Contato encontrado (ID: ${contact.id}) com ${leads.length} lead(s)`);
  leads.forEach((lead) => {
    console.log(`➡️ Lead ID: ${lead.id} | Pipeline: ${lead.pipeline_id} | Status: ${lead.status_id}`);
  });

  return { contact, leads };
}

/**
 * Cria um novo lead no pipeline de Acessórios vinculado a um contato existente.
 */
async function createLead(contactId, name) {
  const payload = [{
    name,
    status_id: STAGE_ID_CONTATO_INICIAL,
    pipeline_id: PIPELINE_ACESSORIOS_ID,
    _embedded: { contacts: [{ id: contactId }] },
  }];

  const res = await axios.post(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  const leadId = res.data._embedded?.leads?.[0]?.id;

  console.log("🆕 Novo lead criado no pipeline de Acessórios:", leadId);
  return leadId;
}

/**
 * Move um lead já existente para o pipeline de Acessórios (caso já esteja nesse pipeline mas em outro estágio).
 */
async function moveLeadToContatoInicial(leadId) {
  const payload = [{
    id: leadId,
    pipeline_id: PIPELINE_ACESSORIOS_ID,
    status_id: STAGE_ID_CONTATO_INICIAL,
  }];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`🔁 Lead ${leadId} movido para 'Contato Inicial' no pipeline de Acessórios`);
}

/**
 * Regra principal: Se já existir lead no pipeline de Acessórios, atualiza se necessário.
 * Se não existir, cria um novo lead mesmo que o contato tenha leads em outros pipelines.
 */
async function pipelineContatoInicialAcessorios({ name, phone }) {
  console.log("📥 Iniciando processo de criação ou atualização de lead no pipeline de Acessórios...");

  const result = await findContactAndLeads(phone);
  if (!result || !result.contact) {
    throw new Error("❌ Contato não encontrado na Kommo");
  }

  const contactId = result.contact.id;
  const leads = result.leads;

  const leadNoPipelineAcessorios = leads.find(
    (l) => l.pipeline_id === PIPELINE_ACESSORIOS_ID
  );

  if (leadNoPipelineAcessorios) {
    if (leadNoPipelineAcessorios.status_id !== STAGE_ID_CONTATO_INICIAL) {
      await moveLeadToContatoInicial(leadNoPipelineAcessorios.id);
    } else {
      console.log("✅ Lead já está no pipeline de Acessórios no status 'Contato Inicial'.");
    }
  } else {
    console.log("➕ Nenhum lead no pipeline de Acessórios. Criando novo lead...");
    await createLead(contactId, name);
  }
}

module.exports = { pipelineContatoInicialAcessorios };
