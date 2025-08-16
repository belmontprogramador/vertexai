const fs = require("fs");
const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const PIPELINE_ID = 11573376;
const STAGES_ORIGEM = [88878664, 88878668, 89186192];
const STAGE_DISPARO_API = 89892884;
const MAX_LEADS_POR_EXECUCAO = 100;
const CHECKPOINT_FILE = "./checkpoint_disparo_boleto.json";

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getLeadsFromStage(stageId) {
  const leads = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads`, {
      headers,
      params: {
        status: stageId, // Mantém
        page,
        limit: 50,
      },
    });

    const fetched = res.data?._embedded?.leads || [];

    // 🔒 Filtra apenas leads que realmente estão no pipeline certo
    const filtrados = fetched.filter(lead => lead.pipeline_id === PIPELINE_ID);
    leads.push(...filtrados);

    hasMore = fetched.length === 50;
    page++;
  }

  return leads;
}


function loadCheckpoint() {
  try {
    const data = fs.readFileSync(CHECKPOINT_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return { skip: 0 };
  }
}

function saveCheckpoint(skip) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ skip }, null, 2));
}

async function moverLeadParaDisparoApi(leadId) {
  const payload = [{
    id: leadId,
    pipeline_id: PIPELINE_ID,
    status_id: STAGE_DISPARO_API,
  }];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`📤 Lead ${leadId} movido para 'Disparo api Boleto'`);
}

async function executar() {
  let todosLeads = [];

  for (const stageId of STAGES_ORIGEM) {
    const leads = await getLeadsFromStage(stageId);
    console.log(`📥 Encontrados ${leads.length} leads no estágio ${stageId}`);
    todosLeads.push(...leads);
  }

  console.log(`🔢 Total geral de leads para mover: ${todosLeads.length}`);

  let checkpoint = loadCheckpoint();

  while (checkpoint.skip < todosLeads.length) {
    const leadsParaProcessar = todosLeads.slice(checkpoint.skip, checkpoint.skip + MAX_LEADS_POR_EXECUCAO);

    console.log(`🚀 Processando de ${checkpoint.skip + 1} até ${checkpoint.skip + leadsParaProcessar.length}...`);

    for (let i = 0; i < leadsParaProcessar.length; i++) {
      const lead = leadsParaProcessar[i];

      try {
        await moverLeadParaDisparoApi(lead.id);
      } catch (err) {
        console.error(`❌ Erro ao mover lead ${lead.id}: ${err.message}`);
      }

      const leadIndex = i + 1;
      const isMultiploDe10 = leadIndex % 10 === 0;
      const isMultiploDe50 = leadIndex % 50 === 0;

      if (isMultiploDe50) {
        console.log("⏸ Pausa extra de 30 minutos (após 50 leads)...");
        await delay(30 * 60 * 1000);
      } else if (isMultiploDe10) {
        console.log("⏸ Pausa de 26 minutos (após 10 leads)...");
        await delay(26 * 60 * 1000);
      } else {
        console.log("⏱ Aguardando 3 minutos...");
        await delay(3 * 60 * 1000);
      }
    }

    checkpoint.skip += leadsParaProcessar.length;
    saveCheckpoint(checkpoint.skip);
    console.log(`✅ Etapa concluída. Checkpoint atualizado para ${checkpoint.skip}`);

    if (checkpoint.skip < todosLeads.length) {
      console.log("😴 Aguardando 12 horas para próxima etapa...");
      await delay(12 * 60 * 60 * 1000); // 12 horas
    }
  }

  console.log("🏁 Todos os leads foram processados!");
}

executar();
