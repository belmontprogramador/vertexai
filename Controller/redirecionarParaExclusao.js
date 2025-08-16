const axios = require("axios");
require("dotenv").config();
const { normalizePhone } = require("../Services/normalizePhone");
const { isBot } = require("../ServicesApiOficial/utils/isBot");

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const PIPELINE_ID = 7471539; // NOVO COMERCIAL VERTEX
const STAGE_ID_LEADS_PARA_EXCLUSAO = 88880100; // Leads para exclusão

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

// 🔍 Busca o contato e o(s) lead(s)
async function findContactAndLeads(phone) {
  const normalized = normalizePhone(phone);
  const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts`, {
    headers,
    params: { query: normalized, with: "leads" },
  });

  const contact = res.data._embedded?.contacts?.[0];
  if (!contact) return null;

  const leads = contact._embedded?.leads || [];
  return { contact, leads };
}

// 🔁 Move lead para "Leads para exclusão"
async function moverParaExclusao(leadId) {
  const payload = [
    {
      id: leadId,
      pipeline_id: PIPELINE_ID,
      status_id: STAGE_ID_LEADS_PARA_EXCLUSAO,
    },
  ];

  await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  console.log(`🗑️ Lead ${leadId} movido para 'Leads para exclusão'`);
}

// 🚀 Função principal
async function moverLeadParaExclusao(phone) {
  const result = await findContactAndLeads(phone);
  if (!result || !result.contact) {
    console.warn("❌ Contato não encontrado.");
    return;
  }

  const leads = result.leads;
  for (const l of leads) {
    try {
      const { data: leadDetail } = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads/${l.id}`, { headers });
      if (!leadDetail.is_deleted && leadDetail.id) {
        await moverParaExclusao(leadDetail.id);
      }
    } catch (err) {
      console.warn(`⚠️ Erro ao mover lead ${l.id}:`, err.response?.data || err.message);
    }
  }
}

// 🌐 Rota de disfarce para botão
const redirecionarParaExclusao = async (req, res) => {
  const userAgent = req.headers["user-agent"] || "";
  const phone = req.query.phone;

  if (!phone) {
    return res.status(400).send("Número de telefone ausente.");
  }

  if (isBot(userAgent)) {
    return res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Vertex Store - Atualização de dados</title>
  <style>
    body { font-family: Arial, sans-serif; background: #fafafa; color: #222; text-align: center; padding: 40px; }
    .box { max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    h1 { color: #d32f2f; }
    .info { margin-top: 20px; font-size: 16px; }
    .footer { margin-top: 40px; font-size: 13px; color: #666; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Dados recebidos com sucesso</h1>
    <p class="info">Estamos processando a sua solicitação.</p>
    <p class="info">Você será redirecionado automaticamente se necessário.</p>
    <div class="footer">© 2025 Vertex Store — Mensagem automatizada sem fins promocionais.</div>
  </div>
</body>
</html>`);
  }

  try {
    await moverLeadParaExclusao(phone);
  } catch (e) {
    console.warn("Erro ao mover para exclusão:", e.message);
  }

  // Renderiza página neutra para humanos
  return res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Processando...</title>
  <script>
    setTimeout(function() {
      document.body.innerHTML = "<p style='font-family:sans-serif;text-align:center;margin-top:50px;'>Solicitação registrada com sucesso.</p>";
    }, Math.floor(200 + Math.random() * 500));
  </script>
</head>
<body>
  <p style="text-align:center;font-family:sans-serif;">Processando sua solicitação...</p>
</body>
</html>`);
};

module.exports = { redirecionarParaExclusao };
