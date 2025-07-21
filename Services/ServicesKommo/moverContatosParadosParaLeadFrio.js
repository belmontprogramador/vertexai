const { getTodosUsuariosComStageESemInteracao } = require("../../Services/redisService");
const { normalizePhone } = require("../../Services/normalizePhone");
const axios = require("axios");
require("dotenv").config();

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const  KOMMO_TOKEN= process.env.KOMMO_TOKEN;

const PIPELINE_ID = 7471539; // NOVO COMERCIAL VERTEX
const STAGE_ID_LEAD_FRIO = 88879072; // LEAD FRIO

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

function passouMaisDe5Dias(timestamp) {
  if (!timestamp) return true;
  const CINCO_DIAS_MS = 1000 * 60 * 60 * 24 * 5;
  return Date.now() - Number(timestamp) > CINCO_DIAS_MS;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findLeadParaMover(phone) {
  const telefoneComMais = phone.startsWith("+") ? phone : `+${normalizePhone(phone)}`;
  const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts`, {
    headers,
    params: {
      query: telefoneComMais,
      with: "leads",
    },
  });

  const contact = res.data._embedded?.contacts?.[0];
  if (!contact) throw new Error("❌ Contato não encontrado.");

  const leads = contact._embedded?.leads || [];

  for (const l of leads) {
    const leadDetail = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads/${l.id}`, { headers });
    const leadData = leadDetail.data;

    // Retorna o primeiro lead válido
    return { contact, lead: leadData };
  }

  throw new Error("❌ Nenhum lead encontrado para este contato.");
}

async function moverLeadParaLeadFrio(leadId) {
  const payload = [{
    id: leadId,
    pipeline_id: PIPELINE_ID,
    status_id: STAGE_ID_LEAD_FRIO,
  }];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`🧊 Lead ${leadId} movido para 'LEAD FRIO'.`);
}

async function moverContatosParadosParaLeadFrio() {
  const contatos = await getTodosUsuariosComStageESemInteracao();
  const contatosParados = contatos.filter(c => passouMaisDe5Dias(c.ultimaInteracao));

  console.log(`🔍 Encontrados ${contatosParados.length} contatos parados há mais de 5 dias.`);

  for (const { sender } of contatosParados) {
    const telefone = normalizePhone(sender);

    try {
      console.log(`➡️ Movendo ${telefone} para 'LEAD FRIO'...`);
      const { lead } = await findLeadParaMover(telefone);
      await moverLeadParaLeadFrio(lead.id);
    } catch (err) {
      console.error(`❌ Erro ao mover ${telefone}: ${err.message}`);
    }

    await delay(60000); // Delay para evitar rate limit
  }
}

module.exports = { moverContatosParadosParaLeadFrio };
