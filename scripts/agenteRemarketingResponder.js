const axios = require("axios");
const Redis = require("ioredis");

// ⚙️ Configurações
const redis = new Redis();
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;
const PIPELINE_REMARKETING_ID = 7471539;
const STATUS_CONTATO_INICIAL_ID = 61175943;

// 📱 Chave Redis por telefone
const chaveRedis = (telefone) => `remarketing:lead_enviado:${telefone}`;

// 🔍 Extrai telefone automaticamente pelo nome do campo
function extrairTelefone(lead) {
  const campo = lead.custom_fields_values?.find(f =>
    f.field_name?.toLowerCase().includes("telefone") ||
    f.field_name?.toLowerCase().includes("celular")
  );
  return campo?.values?.[0]?.value || null;
}

// 🔁 Buscar leads
async function buscarLeadsDoRemarketing() {
  const url = `https://contatovertexstorecombr.kommo.com/api/v4/leads?filter[pipeline_id]=${PIPELINE_REMARKETING_ID}`;
  const { data } = await axios.get(url, {
    headers: { Authorization: `Bearer ${KOMMO_TOKEN}` }
  });
  return data?._embedded?.leads || [];
}

// 📤 Enviar mensagem
async function enviarMensagemDeRemarketing(lead) {
  const telefone = extrairTelefone(lead);
  if (!telefone) {
    console.log("⚠️ Lead sem telefone:", lead.id);
    return;
  }

  const jaEnviado = await redis.get(chaveRedis(telefone));
  if (jaEnviado) {
    console.log(`⏩ Já enviei para ${telefone}`);
    return;
  }

  const mensagem = `📣 Olá! Aqui é da Vertex 📱\n\nVocê ainda está interessado em um de nossos modelos?\n\n*Responda com:*\n1️⃣ Sim, quero continuar\n2️⃣ Não tenho mais interesse`;

  await sendBotMessage(telefone, mensagem);
  await redis.set(chaveRedis(telefone), lead.id);
  console.log(`✅ Mensagem enviada para ${telefone}`);
}

// 🔁 Processar resposta (externo ou manual)
async function processarRespostaUsuario(telefone, respostaTexto) {
  const leadId = await redis.get(chaveRedis(telefone));
  if (!leadId) return;

  if (respostaTexto === "1") {
    await axios.patch(
      `https://contatovertexstorecombr.kommo.com/api/v4/leads/${leadId}`,
      { status_id: STATUS_CONTATO_INICIAL_ID },
      { headers: { Authorization: `Bearer ${KOMMO_TOKEN}` } }
    );
    console.log(`➡️ Lead ${leadId} movido para contato inicial`);
  }

  if (respostaTexto === "2") {
    await axios.delete(
      `https://contatovertexstorecombr.kommo.com/api/v4/leads/${leadId}`,
      { headers: { Authorization: `Bearer ${KOMMO_TOKEN}` } }
    );
    console.log(`🗑️ Lead ${leadId} excluído`);
  }
}

// 📲 Envia mensagem (você pode trocar pela real integração)
async function sendBotMessage(telefone, msg) {
  console.log(`📤 Enviando para ${telefone}:\n${msg}`);
  // aqui entra sua função real de envio de mensagem
}

// ♻️ Loop principal
async function rotinaRemarketing() {
  console.log("⏱️ Rodando rotina de remarketing...");
  const leads = await buscarLeadsDoRemarketing();
  for (const lead of leads) {
    await enviarMensagemDeRemarketing(lead);
  }
  console.log("✅ Fim da rotina.\n");
}

// ▶️ Roda imediatamente e a cada 3 minutos
rotinaRemarketing();
setInterval(rotinaRemarketing, 3 * 60 * 1000);
