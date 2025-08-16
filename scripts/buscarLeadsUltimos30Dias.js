const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;
const PIPELINE_ID = 7214739; // Comercial Vertex

if (!KOMMO_TOKEN) {
  throw new Error("❌ KOMMO_TOKEN não está definido. Verifique o .env");
}

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

function getTimestamp30DiasAtras() {
  const TRINTA_DIAS_MS = 1000 * 60 * 60 * 24 * 30;
  return Math.floor((Date.now() - TRINTA_DIAS_MS) / 1000);
}

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
            `is_deleted=false`, // 👈 filtra só os leads ativos (visíveis no kanban)
          ],
      },
    });

    const batch = res.data._embedded?.leads || [];
    if (batch.length === 0) break;

    leads.push(...batch);
    console.log(`📦 Página ${page}: ${batch.length} leads carregados...`);

    page++;
    await delay(4000); // delay para evitar rate limit
  }

  return leads;
}

async function exibirResumoCompletamente() {
  const todosLeads = await buscarTodosLeadsDoPipeline();

  const timestampLimite = getTimestamp30DiasAtras();

  const leads30Dias = todosLeads.filter(lead => {
    return lead.created_at >= timestampLimite;
  });

  console.log("\n📊 RESUMO DOS LEADS NO PIPELINE:");
  console.log(`➡️ Total de leads no pipeline: ${todosLeads.length}`);
  console.log(`🕓 Leads criados nos últimos 30 dias: ${leads30Dias.length}`);
}

module.exports = { exibirResumoCompletamente };

if (require.main === module) {
  exibirResumoCompletamente();
}
