const axios = require('axios');
const { getLastInteraction } = require("../redisService");
require('dotenv').config();

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const PIPELINE_REMARKETING_ID = 7471539;
const STAGE_REMARKETING_CONTATO_INICIAL_ID = 65271159;

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  'Content-Type': 'application/json'
};

/**
 * Busca o contato e todos os leads com detalhes
 */
async function findContactAndLeadByPhone(phone) {
  const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts`, {
    headers,
    params: {
      query: phone,
      with: 'leads'
    }
  });

  const contact = res.data._embedded?.contacts?.[0];
  if (!contact) throw new Error("❌ Contato não encontrado.");

  const leads = contact._embedded?.leads || [];
  const detailedLeads = [];

  for (const l of leads) {
    const leadDetail = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads/${l.id}`, { headers });
    detailedLeads.push(leadDetail.data);
  }

  return { contact, leads: detailedLeads };
}

/**
 * Move o lead para o pipeline de remarketing (etapa inicial)
 */
async function moverLeadParaRemarketing(leadId) {
  const payload = [
    {
      id: leadId,
      pipeline_id: PIPELINE_REMARKETING_ID,
      status_id: STAGE_REMARKETING_CONTATO_INICIAL_ID
    }
  ];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`📦 Lead ${leadId} movido para o pipeline REMARKETING (etapa: Contato inicial).`);
}

/**
 * Função principal: se estiver inativo por +1 minuto, move o lead
 */
async function pipelineRemarketingInativo(phone) {
  try {
    // 🔒 Verificação robusta do telefone
    if (!phone || typeof phone !== 'string' || phone.trim() === "") {
      console.warn("⚠️ Telefone inválido ou indefinido recebido:", phone);
      return;
    }

    const telefoneComMais = phone.startsWith('+') ? phone : `+${phone}`;
    let timestampUltimaInteracao = await getLastInteraction(telefoneComMais);

    if (!timestampUltimaInteracao) {
        console.warn("⚠️ Nenhuma interação registrada. Usando fallback de inatividade de 10 dias.");
        timestampUltimaInteracao = Date.now() - (3 * 60 * 1000); // ou 5 minutos
      }
      
      

    const agora = Date.now();
    const UM_MINUTO_MS = 3 * 60 * 1000;

    const inativo = (agora - timestampUltimaInteracao) > UM_MINUTO_MS;
    if (!inativo) {
      console.log("⏳ Usuário ainda está ativo nos últimos 60 segundos.");
      return;
    }

    const { contact, leads } = await findContactAndLeadByPhone(telefoneComMais);
    const leadMaisRecente = leads?.[0];

    if (!leadMaisRecente) {
      console.log("⚠️ Nenhum lead encontrado para o contato.");
      return;
    }

    if (leadMaisRecente.pipeline_id === PIPELINE_REMARKETING_ID) {
      console.log("✅ Lead já está no pipeline REMARKETING.");
      return;
    }

    await moverLeadParaRemarketing(leadMaisRecente.id);
  } catch (error) {
    console.error("❌ Erro ao mover lead para remarketing:", error.message);
  }
}

module.exports = { pipelineRemarketingInativo };
