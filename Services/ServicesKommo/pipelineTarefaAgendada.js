const axios = require("axios");
require("dotenv").config();
const { normalizePhone } = require("../normalizePhone");

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const PIPELINE_ID = 7471539; // NOVO COMERCIAL VERTEX
const STAGE_ID_TAREFA_AGENDADA = 88880092; // TAREFA AGENDADA

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

const TAG_TAREFA_AGENDADA = "TarefaAgendada";

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



// 🆕 Criação de novo lead em TAREFA AGENDADA
async function createLead(contactId, name) {
  const payload = [
    {
      name,
      status_id: STAGE_ID_TAREFA_AGENDADA,
      pipeline_id: PIPELINE_ID,
      _embedded: { contacts: [{ id: contactId }] },
    },
  ];

  const res = await axios.post(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  const leadId = res.data._embedded?.leads?.[0]?.id;

  console.log("🆕 Novo lead criado em 'TAREFA AGENDADA':", leadId);
  await adicionarTagAoLead(leadId, TAG_TAREFA_AGENDADA);
  return leadId;
}

// 🔁 Move o lead para TAREFA AGENDADA
async function moveLeadToTarefaAgendada(leadId) {
  const payload = [
    {
      id: leadId,
      pipeline_id: PIPELINE_ID,
      status_id: STAGE_ID_TAREFA_AGENDADA,
    },
  ];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`📌 Lead ${leadId} movido para 'TAREFA AGENDADA'`);
  await adicionarTagAoLead(leadId, TAG_TAREFA_AGENDADA);
}

// 🚀 Função principal
async function pipelineTarefaAgendada({ name, phone }) {
  console.log("📥 Iniciando processo de movimentação para 'TAREFA AGENDADA'...");

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
        console.log(`📌 Movendo lead ${leadDetail.id} para TAREFA AGENDADA...`);
        await moveLeadToTarefaAgendada(leadDetail.id);
        return;
      }
    } catch (err) {
      console.warn(`⚠️ Erro ao buscar detalhes do lead ${l.id}:`, err.message);
    }
  }

  console.log("➕ Nenhum lead válido encontrado. Criando novo lead...");
  await createLead(contactId, name || "Novo Lead Vertex");
}

module.exports = { pipelineTarefaAgendada };
