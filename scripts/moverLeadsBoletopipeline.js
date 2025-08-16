const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const PIPELINE_ATUAL_ID = 7214739; // COMERCIAL VERTEX
const STAGE_ATUAL_ID = 74576504;   // Boleto

const PIPELINE_DESTINO_ID = 11573376; // NOVO COMERCIAL VERTEX BOLETO
const STAGE_DESTINO_ID = 89186192;    // remarketing 5 dias

const TAG_NAME = "BOLETO";
const DELAY_MS = 40000;

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

// ⏱️ Criado há mais de 5 dias
function criadoHaMaisDe5Dias(timestamp) {
  const agora = Date.now() / 1000;
  const cincoDias = 5 * 24 * 60 * 60;
  const diff = agora - timestamp;
  return diff >= cincoDias;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function buscarLeadsValidos() {
  const leadsValidos = [];
  let page = 1;
  const limit = 250;

  while (true) {
    const { data } = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads`, {
      headers,
      params: { limit, page },
    });

    const leads = data?._embedded?.leads || [];

    for (const lead of leads) {
      const tags = lead._embedded?.tags || [];
      const temTag = tags.some(tag => tag.name === TAG_NAME);
      const pipelineOK = lead.pipeline_id === PIPELINE_ATUAL_ID;
      const stageOK = lead.status_id === STAGE_ATUAL_ID;
      const ativo = !lead.is_deleted;
      const tempoOK = criadoHaMaisDe5Dias(lead.created_at);

      if (temTag && pipelineOK && stageOK && ativo && tempoOK) {
        leadsValidos.push({ id: lead.id, nome: lead.name });
      }
    }

    if (!data?._links?.next) break;
    page++;
    await delay(2000);
  }

  return leadsValidos;
}

async function moverLead(leadId) {
  const payload = [
    {
      id: leadId,
      pipeline_id: PIPELINE_DESTINO_ID,
      status_id: STAGE_DESTINO_ID,
    },
  ];

  try {
    await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
    console.log(`✅ Lead ${leadId} movido para 'remarketing 5 dias'.`);
  } catch (err) {
    console.error(`❌ Erro ao mover lead ${leadId}:`, err.response?.data || err.message);
  }
}

async function executar() {
  console.log(`🔍 Buscando leads com a tag '${TAG_NAME}' criados há mais de 5 dias...`);
  const leads = await buscarLeadsValidos();
  console.log(`📋 Leads encontrados: ${leads.length}`);

  for (const lead of leads) {
    console.log(`➡️ Movendo ${lead.nome} (ID: ${lead.id})...`);
    await moverLead(lead.id);
    await delay(DELAY_MS);
  }

  console.log("✅ Fim do processamento.");
}

executar();
