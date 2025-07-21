const axios = require('axios');
require('dotenv').config({ path: '../.env' });

const KOMMO_BASE_URL = 'https://contatovertexstorecombr.kommo.com';
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const PIPELINE_ID = 7214739;
const ESTAGIO_BOLETO = 74576504;
const ESTAGIO_DISPARO_NOTE50 = 74985044;

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  'Content-Type': 'application/json'
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getLeadsUltimos5Dias() {
  const cincoDiasAtras = Math.floor((Date.now() - 10 * 24 * 60 * 60 * 1000) / 1000);

  const response = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads`, {
    headers,
    params: {
      filter: {
        pipeline_id: PIPELINE_ID,
        statuses: [ESTAGIO_BOLETO],
        created_at: { from: cincoDiasAtras }
      }
    }
  });

  return response.data._embedded.leads;
}

async function moverLeadParaDisparoNote50(leadId) {
  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, [{
    id: leadId,
    status_id: ESTAGIO_DISPARO_NOTE50,
    pipeline_id: PIPELINE_ID
  }], { headers });
}

async function processarLeads() {
  try {
    const leads = await getLeadsUltimos5Dias();

    console.log(`Encontrados ${leads.length} leads para mover.`);

    for (const lead of leads) {
      try {
        console.log(`Movendo lead ${lead.id}...`);
        await moverLeadParaDisparoNote50(lead.id);
        console.log(`✅ Lead ${lead.id} movido com sucesso.`);
      } catch (error) {
        console.error(`❌ Erro ao mover lead ${lead.id}:`, error.response?.data || error.message);
      }

      console.log('⏳ Esperando 30 segundos antes do próximo lead...');
      await delay(180000); // espera 30 segundos
    }

    console.log('🎯 Processo finalizado com sucesso!');

  } catch (err) {
    console.error('Erro ao processar leads:', err.response?.data || err.message);
  }
}

processarLeads();
