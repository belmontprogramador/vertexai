const axios = require('axios');
require('dotenv').config();
const { sendBotMessage } = require("../messageSender");

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  'Content-Type': 'application/json'
};

// Função para encontrar o lead de um telefone
async function encontrarLeadPorTelefone(phone) {
  const numero = phone.startsWith("+") ? phone : `+${phone}`;
  const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts`, {
    headers,
    params: {
      query: numero,
      with: "leads"
    }
  });

  const contato = res.data._embedded?.contacts?.[0];
  if (!contato) throw new Error("❌ Contato não encontrado.");

  const lead = contato._embedded?.leads?.[0];
  if (!lead?.id) throw new Error("❌ Lead não encontrado para o contato.");

  return lead.id;
}

// Agendar tarefa
async function agendarTarefa({ texto, dataTimestamp, entityId, entityType = "leads" }) {
  const payload = [
    {
      task_type_id: 1,
      text: texto,
      complete_till: dataTimestamp,
      entity_id: entityId,
      entity_type: entityType,
      request_id: "agendamento_customizado"
    }
  ];

  const response = await axios.post(`${KOMMO_BASE_URL}/api/v4/tasks`, payload, { headers });
  return response.data;
}

// Função principal que junta tudo
async function agendarParaContato({ sender, dataTimestamp, texto }) {
  try {
    const leadId = await encontrarLeadPorTelefone(sender);
    const tarefaCriada = await agendarTarefa({
      texto,
      dataTimestamp,
      entityId: leadId
    });

    await sendBotMessage(sender, "📌 Sua tarefa foi agendada com sucesso!");
    console.log("✅ Tarefa criada:", tarefaCriada);
  } catch (err) {
    console.error("❌ Erro ao agendar tarefa:", err.message);
    await sendBotMessage(sender, "❌ Tive um problema para agendar sua tarefa. Tente novamente.");
  }
}

module.exports = { agendarParaContato };
