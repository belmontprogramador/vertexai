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
 * Busca um contato pelo número de telefone
 */
async function findContactByPhone(phone) {
  const response = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts`, {
    headers,
    params: { query: phone }
  });

  const contatos = response.data?._embedded?.contacts || [];
  return contatos.length ? contatos[0] : null;
}

/**
 * Move um lead existente para o estágio "Conhecendo a loja"
 */
async function moveLeadToConhecendoALojaStage(leadId) {
  const payload = [{
    id: leadId,
    pipeline_id: PIPELINE_ID, // obrigatório se quiser garantir consistência
    status_id: STAGE_ID_CONHECENDO_A_LOJA
  }];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`📦 Lead ${leadId} movido para o estágio 'Conhecendo a loja'`);
}

/**
 * Cria um novo lead no pipeline "COMERCIAL VERTEX" no estágio "Conhecendo a loja"
 */
async function createLeadInConhecendoALojaStage(contactId, name) {
  const leadData = [{
    name,
    pipeline_id: PIPELINE_ID,
    status_id: STAGE_ID_CONHECENDO_A_LOJA,
    _embedded: {
      contacts: [{ id: contactId }]
    }
  }];

  const response = await axios.post(`${KOMMO_BASE_URL}/api/v4/leads`, leadData, { headers });
  const createdLead = response.data._embedded?.leads?.[0];

  if (!createdLead?.id) {
    throw new Error("❌ Erro ao criar lead no estágio 'Conhecendo a loja'.");
  }

  console.log("✅ Lead criado no estágio 'Conhecendo a loja':", createdLead.id);
  return createdLead.id;
}

/**
 * Função principal que move ou cria um lead no estágio "Conhecendo a loja"
 */
async function pipelineConhecendoALoja(phone, name = "Lead do WhatsApp") {
  const contato = await findContactByPhone(phone);
  if (!contato) throw new Error("❌ Contato não encontrado no Kommo.");

  const leads = contato._embedded?.leads || [];

  // 🔍 Busca um lead existente no pipeline "COMERCIAL VERTEX"
  const leadNoPipeline = leads.find(lead => lead?.pipeline_id === PIPELINE_ID);

  if (leadNoPipeline?.id) {
    // ✅ Se já tem lead no pipeline, apenas move de estágio
    await moveLeadToConhecendoALojaStage(leadNoPipeline.id);
  } else {
    // 🚀 Caso não tenha lead no pipeline, cria um novo
    await createLeadInConhecendoALojaStage(contato.id, name);
  }
}

module.exports = { pipelineConhecendoALoja };
