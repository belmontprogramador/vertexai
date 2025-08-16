const axios = require("axios");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;
const PIPELINE_ID = 7214739;
const STATUS_ID_LEADS_PARA_EXCLUSAO = 89406956;

if (!KOMMO_TOKEN) throw new Error("❌ KOMMO_TOKEN não está definido no .env");

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

function getTimestamp30DiasAtras() {
  const MS = 1000 * 60 * 60 * 24 * 30;
  return Math.floor((Date.now() - MS) / 1000);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let filaDeLeads = [];

async function buscarLeadsAntigos() {
  let page = 1;
  const limit = 250;
  const leads = [];
  const createdBefore = getTimestamp30DiasAtras();

  while (true) {
    const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads`, {
      headers,
      params: {
        limit,
        page,
        filter: {
          pipeline_id: PIPELINE_ID,
          is_deleted: false,
        },
        with: "contacts",
      },
    });

    const batch = res.data._embedded?.leads || [];
    if (batch.length === 0) break;

    const antigos = batch.filter(lead => lead.created_at <= createdBefore);
    leads.push(...antigos);

    console.log(`📦 Página ${page}: ${antigos.length} leads antigos encontrados...`);
    page++;
    await delay(4000);
  }

  return leads;
}

async function moverLeadParaStatus(leadId) {
  try {
    await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads/${leadId}`, {
      status_id: STATUS_ID_LEADS_PARA_EXCLUSAO,
    }, { headers });

    console.log(`🔁 Lead ${leadId} movido para o status ${STATUS_ID_LEADS_PARA_EXCLUSAO}`);
  } catch (err) {
    console.error(`❌ Erro ao mover lead ${leadId}:`, err.response?.data || err.message);
  }
}

async function carregarFila() {
  const leadsAntigos = await buscarLeadsAntigos();
  filaDeLeads = leadsAntigos.map(lead => ({
    leadId: lead.id,
  }));
  console.log(`📋 Total de leads na fila: ${filaDeLeads.length}`);
}

async function processarProximo() {
  if (filaDeLeads.length === 0) {
    console.log("✅ Fila esvaziada. Nenhum lead a mover.");
    return;
  }

  const item = filaDeLeads.shift();
  console.log(`⏳ Processando lead ${item.leadId}...`);
  await moverLeadParaStatus(item.leadId);
}

// Executa: carrega fila e inicia loop
(async () => {
  await carregarFila();
  await processarProximo();

  setInterval(async () => {
    await processarProximo();
  }, 40_000);
})();
