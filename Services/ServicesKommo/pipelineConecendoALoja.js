const axios = require('axios');
require('dotenv').config();

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

// IDs fixos do Kommo
const PIPELINE_ID = 7214739; // "COMERCIAL VERTEX"
const STAGE_ID_CONHECENDO_A_LOJA = 61182927; // "Conhecendo a loja"

// Headers de autenticação
const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  'Content-Type': 'application/json'
};

/**
 * Busca um contato e retorna o primeiro lead associado
 */
async function findLeadIdByPhone(phone) {
  const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts`, {
    headers,
    params: {
      query: phone,
      with: 'leads'
    }
  });

  const contato = res.data._embedded?.contacts?.[0];

  if (!contato) {
    throw new Error("❌ Contato não encontrado.");
  }

  const lead = contato._embedded?.leads?.[0];

  if (!lead?.id) {
    throw new Error("❌ Nenhum lead vinculado a esse contato.");
  }

  return lead.id;
}

/**
 * Atualiza o lead para o pipeline correto e move para "Conhecendo a loja"
 */
async function updateLeadToConhecendoALoja(leadId) {
  const payload = [
    {
      id: leadId,
      pipeline_id: PIPELINE_ID,
      status_id: STAGE_ID_CONHECENDO_A_LOJA
    }
  ];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`📦 Lead ${leadId} movido para o estágio 'Conhecendo a loja' no pipeline correto.`);
}

/**
 * Função principal: localiza o lead e atualiza o pipeline + estágio
 */
async function pipelineConhecendoALoja(phone) {
  const telefoneComMais = phone.startsWith('+') ? phone : `+${phone}`;
  const leadId = await findLeadIdByPhone(telefoneComMais);
  await updateLeadToConhecendoALoja(leadId);
}

module.exports = { pipelineConhecendoALoja };
