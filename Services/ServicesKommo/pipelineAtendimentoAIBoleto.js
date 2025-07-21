const axios = require("axios");
require("dotenv").config();
const { normalizePhone } = require("../normalizePhone");

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const ORIGEM_PIPELINE_ID = 7471539; // NOVO COMERCIAL VERTEX
const DESTINO_PIPELINE_ID = 11573376; // NOVO COMERCIAL VERTEX BOLETO
const STAGE_ID_ATENDIMENTO_AI = 88878660;

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

// 🔍 Busca contato e leads existentes
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

// 🏷️ Adiciona a tag "boletopipeline" ao lead
async function adicionarTagBoletopipeline(leadId) {
  const payload = [{ id: leadId, _embedded: { tags: [{ name: "boletopipeline" }] } }];
  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`🏷️ Tag "boletopipeline" adicionada ao lead ${leadId}`);
}

// 🔁 Movimenta o lead para o novo pipeline/estágio e adiciona tag
async function moveLeadToPipelineBoleto(leadId) {
  const payload = [
    {
      id: leadId,
      pipeline_id: DESTINO_PIPELINE_ID,
      status_id: STAGE_ID_ATENDIMENTO_AI,
    },
  ];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`🔁 Lead ${leadId} movido para pipeline 'BOLETO' (ID ${DESTINO_PIPELINE_ID}) no estágio 'atendimento ai'`);

  // ➕ Adiciona a tag após a movimentação
  await adicionarTagBoletopipeline(leadId);
}

// 🎯 Função principal
async function pipelineAtendimentoAIBoleto({ name, phone }) {
  console.log("📥 Iniciando processo de movimentação de lead para 'NOVO COMERCIAL VERTEX BOLETO'...");

  const result = await findContactAndLeads(phone);
  if (!result || !result.contact) {
    throw new Error("❌ Contato não encontrado na Kommo");
  }

  const leads = result.leads;

  for (const l of leads) {
    try {
      const { data: leadDetail } = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads/${l.id}`, { headers });

      const isDoPipelineOrigem = leadDetail.pipeline_id === ORIGEM_PIPELINE_ID;
      const isAtivo = !leadDetail.is_deleted;

      if (isDoPipelineOrigem && isAtivo) {
        console.log(`✅ Lead válido encontrado no pipeline original (ID: ${leadDetail.id}). Movendo...`);
        await moveLeadToPipelineBoleto(leadDetail.id);
        return;
      }
    } catch (err) {
      console.warn(`⚠️ Erro ao buscar detalhes do lead ${l.id}:`, err.message);
    }
  }

  console.log("🚫 Nenhum lead no pipeline de origem foi encontrado para mover.");
}

module.exports = { pipelineAtendimentoAIBoleto };
