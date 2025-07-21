const axios = require('axios');
require('dotenv').config();

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  'Content-Type': 'application/json'
};

/**
 * Normaliza telefone (remove @c.us e adiciona + se necessário)
 */
function normalizarTelefone(input) {
  let telefone = input.replace("@c.us", "");
  if (!telefone.startsWith("+")) {
    telefone = `+${telefone}`;
  }
  return telefone;
}

/**
 * Busca o contato e todos os leads, retorna o lead do pipeline correto
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

  if (leads.length === 0) throw new Error("❌ Nenhum lead vinculado ao contato.");

  // Retorna o primeiro lead encontrado
  return {
    contact,
    leadId: leads[0].id,
    contactId: contact.id
  };
}

/**
 * Atualiza o nome do lead (visível no topo do card)
 */
async function atualizarNomeDoLead(leadId, novoNome) {
  const payload = [
    {
      id: leadId,
      name: novoNome
    }
  ];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`✏️ Lead ${leadId} atualizado com o nome: "${novoNome}"`);
}

/**
 * (Opcional) Atualiza o nome do contato também
 */
async function atualizarNomeDoContato(contactId, novoNome) {
  const payload = [
    {
      id: contactId,
      name: novoNome
    }
  ];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/contacts`, payload, { headers });
  console.log(`👤 Contato ${contactId} atualizado com o nome: "${novoNome}"`);
}

/**
 * Função principal: atualiza nome do lead e, opcionalmente, do contato
 */
async function atualizarNomeLeadPorTelefone(phoneRaw, novoNome, incluirContato = true) {
  const telefone = normalizarTelefone(phoneRaw);
  const { leadId, contactId } = await findContactAndLeadByPhone(telefone);

  await atualizarNomeDoLead(leadId, novoNome);

  if (incluirContato) {
    await atualizarNomeDoContato(contactId, novoNome);
  }
  return leadId;
}

module.exports = { atualizarNomeLeadPorTelefone };
