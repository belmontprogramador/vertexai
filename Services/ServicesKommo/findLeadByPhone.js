const axios = require("axios");
require("dotenv").config();
const { normalizePhone } = require("../normalizePhone");

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

// 🔍 Busca o primeiro lead válido do contato
async function findLeadByPhone(phone) {
    const telefoneComMais = phone.startsWith("+") ? phone : `+${normalizePhone(phone)}`;
    console.log("📞 Buscando por telefone:", telefoneComMais);
  
    const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts`, {
      headers,
      params: { query: telefoneComMais, with: "leads" },
    });
  
    const contact = res.data._embedded?.contacts?.[0];
    if (!contact) {
      console.log("❌ Contato não encontrado na Kommo.");
      return null;
    }
  
    console.log(`👤 Contato encontrado: ID ${contact.id}`);
    const leads = contact._embedded?.leads || [];
  
    console.log(`📋 Total de leads encontrados: ${leads.length}`);
    for (const l of leads) {
      console.log(`🔍 Checando lead ID: ${l.id}`);
      try {
        const { data: lead } = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads/${l.id}`, { headers });
        console.log(`➡️ Lead ${l.id} | status_id: ${lead.status_id} | is_deleted: ${lead.is_deleted}`);
  
        if (!lead.is_deleted && lead.status_id) {
          console.log(`✅ Lead válido encontrado: ${lead.id}`);
          return lead.id;
        }
      } catch (err) {
        console.error(`❌ Erro ao buscar detalhes do lead ${l.id}:`, err.message);
      }
    }
  
    console.log("⚠️ Nenhum lead válido retornado da Kommo.");
    return null;
  }
  

// ❌ Exclui o lead pelo ID
async function deleteLeadById(leadId) {
  await axios.delete(`${KOMMO_BASE_URL}/api/v4/leads/${leadId}`, { headers });
  console.log(`🗑️ Lead ${leadId} excluído com sucesso.`);
}

// 🔁 Função final: localiza e exclui
async function deleteLeadByPhone(phone) {
  try {
    const leadId = await findLeadByPhone(phone);
    if (!leadId) {
      console.warn("⚠️ Nenhum lead válido encontrado para exclusão.");
      return;
    }

    await deleteLeadById(leadId);
  } catch (error) {
    console.error("❌ Erro ao excluir lead:", error.response?.data || error.message);
    throw error;
  }
}

// ✅ Exportações necessárias
module.exports = {
  findLeadByPhone,
  deleteLeadById,
  deleteLeadByPhone,
};
