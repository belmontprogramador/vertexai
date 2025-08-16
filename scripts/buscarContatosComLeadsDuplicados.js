const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;
const PIPELINE_ID = 7214739; // COMERCIAL VERTEX

if (!KOMMO_TOKEN) {
  throw new Error("❌ KOMMO_TOKEN não está definido. Verifique o .env");
}

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function buscarTodosLeadsDoPipeline() {
  let page = 1;
  const limit = 250;
  const leads = [];

  while (true) {
    const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads`, {
      headers,
      params: {
        limit,
        page,
        filter: [
          `pipeline_id=${PIPELINE_ID}`,
          `is_deleted=false`,
        ],
        with: "contacts",
      },
    });

    const batch = res.data._embedded?.leads || [];
    if (batch.length === 0) break;

    leads.push(...batch);
    console.log(`📦 Página ${page}: ${batch.length} leads carregados...`);

    page++;
    await delay(4000); // 4s de delay para evitar rate limit
  }

  return leads;
}

async function buscarContatosComLeadsDuplicados() {
  const leads = await buscarTodosLeadsDoPipeline();

  const contatoCountMap = {};
  const leadsPorContato = {};

  for (const lead of leads) {
    const contatos = lead._embedded?.contacts || [];

    for (const contato of contatos) {
      const contactId = contato.id;

      contatoCountMap[contactId] = (contatoCountMap[contactId] || 0) + 1;
      if (!leadsPorContato[contactId]) leadsPorContato[contactId] = [];
      leadsPorContato[contactId].push(lead.id);
    }
  }

  const duplicados = Object.entries(contatoCountMap)
    .filter(([_, count]) => count > 1)
    .map(([contactId]) => ({
      contactId,
      leadIds: leadsPorContato[contactId],
    }));

  console.log(`\n🔍 Contatos com mais de um lead: ${duplicados.length}`);
  duplicados.forEach(({ contactId, leadIds }, i) => {
    console.log(`\n${i + 1}. Contato ID: ${contactId}`);
    console.log(`   Leads: ${leadIds.join(", ")}`);
  });
}

module.exports = { buscarContatosComLeadsDuplicados };

if (require.main === module) {
  buscarContatosComLeadsDuplicados();
}
