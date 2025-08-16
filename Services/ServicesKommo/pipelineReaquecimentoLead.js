const axios = require("axios");
require("dotenv").config();
const { normalizePhone } = require("../normalizePhone");

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const PIPELINE_ID = 7471539; // NOVO COMERCIAL VERTEX
const STAGE_ID_REAQUECIMENTO = 89013640; // REAQUECIMENTO LEAD
const TAG_REAQUECIMENTO = "ReaquecimentoLead";

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

// 🔍 Busca contato e leads
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

// 🏷 Adiciona tag ao lead
// ✅ Corrigido: adiciona tag via PATCH no lead
// ✅ Adiciona nova tag sem remover as existentes
async function adicionarTagAoLead(leadId, novaTag) {
  try {
    // Passo 1: Buscar tags atuais do lead
    const { data: lead } = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads/${leadId}`, { headers });
    const tagsAtuais = lead._embedded?.tags?.map(tag => tag.name) || [];

    // Passo 2: Verificar se a tag já existe
    if (tagsAtuais.includes(novaTag)) {
      console.log(`ℹ️ Tag '${novaTag}' já presente no lead ${leadId}`);
      return;
    }

    // Passo 3: Enviar todas as tags antigas + nova tag
    const payload = {
      _embedded: {
        tags: [...tagsAtuais.map(name => ({ name })), { name: novaTag }],
      },
    };

    await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads/${leadId}`, payload, { headers });
    console.log(`🏷 Tag '${novaTag}' adicionada ao lead ${leadId}`);
  } catch (err) {
    console.warn(`⚠️ Erro ao adicionar tag ao lead ${leadId}:`, err.response?.data || err.message);
  }
}



// 🆕 Criação de novo lead em REAQUECIMENTO
async function createLead(contactId, name) {
  const payload = [
    {
      name,
      status_id: STAGE_ID_REAQUECIMENTO,
      pipeline_id: PIPELINE_ID,
      _embedded: { contacts: [{ id: contactId }] },
    },
  ];

  const res = await axios.post(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  const leadId = res.data._embedded?.leads?.[0]?.id;

  console.log("🆕 Novo lead criado no pipeline 'NOVO COMERCIAL VERTEX' em 'REAQUECIMENTO LEAD':", leadId);
  await adicionarTagAoLead(leadId, TAG_REAQUECIMENTO);
  return leadId;
}

// 🔁 Move o lead para REAQUECIMENTO
async function moveLeadToReaquecimento(leadId) {
  const payload = [
    {
      id: leadId,
      pipeline_id: PIPELINE_ID,
      status_id: STAGE_ID_REAQUECIMENTO,
    },
  ];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`♻️ Lead ${leadId} movido para 'REAQUECIMENTO LEAD' no pipeline 'NOVO COMERCIAL VERTEX'`);
  await adicionarTagAoLead(leadId, TAG_REAQUECIMENTO);
}

// 🚀 Função principal
async function pipelineReaquecimentoLead({ name, phone }) {
  console.log("📥 Iniciando processo de movimentação para 'REAQUECIMENTO LEAD'...");

  const result = await findContactAndLeads(phone);
  if (!result || !result.contact) {
    throw new Error("❌ Contato não encontrado na Kommo");
  }

  const contactId = result.contact.id;
  const leads = result.leads;

  for (const l of leads) {
    try {
      const { data: leadDetail } = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads/${l.id}`, { headers });

      if (!leadDetail.is_deleted && leadDetail.id) {
        console.log(`♻️ Movendo lead ${leadDetail.id} para REAQUECIMENTO...`);
        await moveLeadToReaquecimento(leadDetail.id);
        return;
      }
    } catch (err) {
      console.warn(`⚠️ Erro ao buscar detalhes do lead ${l.id}:`, err.message);
    }
  }

  console.log("➕ Nenhum lead válido encontrado. Criando novo lead...");
  await createLead(contactId, name || "Novo Lead Vertex");
}

module.exports = { pipelineReaquecimentoLead };
