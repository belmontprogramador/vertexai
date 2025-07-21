const axios = require("axios");
require("dotenv").config();
const { normalizePhone } = require("../normalizePhone");

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const PIPELINE_ID = 7471539; // NOVO COMERCIAL VERTEX
const STAGE_ID_ATENDIMENTO_AI = 61175943; // aTENDIMENTO aI

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

// 🔍 Busca contato e lista básica de leads
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

// 🆕 Criação de novo lead
async function createLead(contactId, name) {
  const payload = [
    {
      name,
      status_id: STAGE_ID_ATENDIMENTO_AI,
      pipeline_id: PIPELINE_ID,
      _embedded: { contacts: [{ id: contactId }] },
    },
  ];

  const res = await axios.post(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  const leadId = res.data._embedded?.leads?.[0]?.id;

  console.log("🆕 Novo lead criado no pipeline 'NOVO COMERCIAL VERTEX' em 'aTENDIMENTO aI':", leadId);
  return leadId;
}

// 🔁 Movimentação do lead para o pipeline/estágio corretos
async function moveLeadToAtendimentoAI(leadId) {
  const payload = [
    {
      id: leadId,
      pipeline_id: PIPELINE_ID,
      status_id: STAGE_ID_ATENDIMENTO_AI,
    },
  ];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`🔁 Lead ${leadId} movido para 'aTENDIMENTO aI' no pipeline 'NOVO COMERCIAL VERTEX'`);
}

// 🔁 Lógica principal de movimentação ou criação
async function pipelineAtendimentoAI({ name, phone }) {
  console.log("📥 Iniciando processo de criação ou movimentação de lead para 'NOVO COMERCIAL VERTEX'...");

  const result = await findContactAndLeads(phone);
  if (!result || !result.contact) {
    throw new Error("❌ Contato não encontrado na Kommo");
  }

  const contactId = result.contact.id;
  const leads = result.leads;

  // 🔍 Busca detalhes de cada lead
  for (const l of leads) {
    try {
      const { data: leadDetail } = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads/${l.id}`, { headers });

      if (!leadDetail.is_deleted && leadDetail.status_id && leadDetail.id) {
        console.log(`🔁 Lead encontrado (ID: ${leadDetail.id}). Movendo para pipeline/stage corretos...`);
        await moveLeadToAtendimentoAI(leadDetail.id);
        return;
      }
    } catch (err) {
      console.warn(`⚠️ Erro ao buscar detalhes do lead ${l.id}:`, err.message);
    }
  }

  // 🆕 Nenhum lead válido → cria um novo
  console.log("➕ Nenhum lead válido encontrado. Criando novo lead...");
  await createLead(contactId, name);
}

module.exports = { pipelineAtendimentoAI };
