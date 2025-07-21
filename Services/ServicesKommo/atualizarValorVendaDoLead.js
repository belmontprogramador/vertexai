const axios = require('axios');
require('dotenv').config();

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  'Content-Type': 'application/json'
};

/**
 * Normaliza o telefone removendo "@c.us" e adiciona "+" se necessário
 */
function normalizarTelefone(input) {
  let telefone = input.replace("@c.us", "");
  if (!telefone.startsWith("+")) {
    telefone = `+${telefone}`;
  }
  return telefone;
}

/**
 * Busca o leadId a partir do telefone
 */
async function findLeadIdByPhone(phoneRaw) {
  const telefone = normalizarTelefone(phoneRaw);

  const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts`, {
    headers,
    params: {
      query: telefone,
      with: 'leads'
    }
  });

  const contact = res.data._embedded?.contacts?.[0];
  if (!contact) throw new Error("❌ Contato não encontrado.");

  const leads = contact._embedded?.leads || [];
  if (leads.length === 0) throw new Error("❌ Nenhum lead vinculado ao contato.");

  return leads[0].id;
}

/**
 * Atualiza o valor da venda (campo `price` nativo) de um lead no Kommo
 * Pode receber ID do lead diretamente ou telefone com "@c.us"
 */
async function atualizarValorVendaDoLead(leadIdOuTelefone, valorEmReais) {
    try {
      let leadId = leadIdOuTelefone;
  
      if (typeof leadIdOuTelefone === "string") {
        if (leadIdOuTelefone.includes("@c.us")) {
          // busca id
          console.log(`📞 Recebido telefone: ${leadIdOuTelefone}`);
          leadId = await findLeadIdByPhone(leadIdOuTelefone);
          console.log(`🔍 Lead ID encontrado via telefone: ${leadId}`);
          if (!leadId) throw new Error("❌ LeadId não encontrado a partir do telefone.");
        } else if (!/^\d+$/.test(leadIdOuTelefone)) {
          throw new Error("❌ Valor passado não é um leadId numérico nem um telefone válido com @c.us.");
        }
      }
  
      if (!leadId || isNaN(parseInt(leadId))) {
        throw new Error("❌ LeadId inválido.");
      }
  
      console.log(`🧾 Preparando atualização para leadId=${leadId} com valor=R$${valorEmReais}`);
  
      const payload = [
        {
          id: parseInt(leadId),
          price: parseFloat(valorEmReais)
        }
      ];
  
      await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
      console.log(`✅ Lead ${leadId} atualizado com valor de venda (price): R$${valorEmReais}`);
    } catch (error) {
      console.error("❌ Erro ao atualizar valor do lead:", error.response?.data || error.message);
      throw error;
    }
  }
  
module.exports = { atualizarValorVendaDoLead };
