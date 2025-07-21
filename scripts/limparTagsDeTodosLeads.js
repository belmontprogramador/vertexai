const axios = require("axios");
require('dotenv').config();
console.log("🔐 KOMMO_TOKEN carregado:", process.env.KOMMO_TOKEN?.slice(0, 20)); // imprime os primeiros 20 caracteres


const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

async function buscarTodosLeads() {
  let leads = [];
  let page = 1;

  while (true) {
    const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads`, {
      headers,
      params: {
        page,
        limit: 250,
      },
    });

    const encontrados = res.data._embedded?.leads || [];
    if (encontrados.length === 0) break;

    leads = leads.concat(encontrados);
    page++;
  }

  return leads;
}

async function removerTagsDoLead(leadId) {
  try {
    await axios.patch(
      `${KOMMO_BASE_URL}/api/v4/leads`,
      [
        {
          id: leadId,
          _embedded: {
            tags: [],
          },
        },
      ],
      { headers }
    );
    console.log(`✅ Tags removidas do lead ${leadId}`);
  } catch (err) {
    console.error(`❌ Erro ao remover tags do lead ${leadId}`);
    console.error(err.response?.data || err.message);
  }
}

async function limparTagsDeTodosLeads() {
  console.log("🔍 Buscando todos os leads...");
  const leads = await buscarTodosLeads();
  console.log(`📦 Total de leads encontrados: ${leads.length}`);

  for (const lead of leads) {
    await removerTagsDoLead(lead.id);
  }

  console.log("🏁 Fim da remoção de tags.");
}

limparTagsDeTodosLeads();
