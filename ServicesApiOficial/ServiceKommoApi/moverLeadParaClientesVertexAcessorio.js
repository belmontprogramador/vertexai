const axios = require("axios");
require("dotenv").config();
const { getNomeUsuarioApiOficial } = require("../../Services/redisService");
const { normalizePhone } = require("../../Services/normalizePhone");

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const PIPELINE_CLIENTES_VERTEX = 9747244;
const STATUS_ACESSORIO = 89499320;

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

async function moverLeadParaClientesVertexAcessorio(telefoneSemMais) {
  try {
    const telefone = normalizePhone(telefoneSemMais);
    const nome = await getNomeUsuarioApiOficial(telefoneSemMais);
    console.log("📞 Número normalizado:", telefone);

    const contatoResp = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts`, {
      headers,
      params: { query: telefone, with: "leads" },
    });

    const contato = contatoResp.data._embedded?.contacts?.[0];
    if (!contato) {
      const payload = [
        {
          name: nome || telefone,
          custom_fields_values: [
            {
              field_code: "PHONE",
              values: [{ value: telefone }],
            },
          ],
        },
      ];
      const res = await axios.post(`${KOMMO_BASE_URL}/api/v4/contacts`, payload, {
        headers,
      });
      const novoContato = res.data._embedded?.contacts?.[0];
      console.log("🆕 Contato criado:", novoContato.id);
      return await criarLeadAcessorio(novoContato.id, nome);
    }

    const leads = contato._embedded?.leads || [];
    let leadExistente = null;
    for (const l of leads) {
      const leadResp = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads/${l.id}`, { headers });
      const lead = leadResp.data;
      if (lead.pipeline_id === PIPELINE_CLIENTES_VERTEX) {
        leadExistente = lead;
        break;
      }
    }

    if (!leadExistente) {
      return await criarLeadAcessorio(contato.id, nome);
    }

    const precisaAtualizar =
      leadExistente.status_id !== STATUS_ACESSORIO ||
      (nome && leadExistente.name !== nome);

    if (precisaAtualizar) {
      const payload = [
        {
          id: leadExistente.id,
          pipeline_id: PIPELINE_CLIENTES_VERTEX,
          status_id: STATUS_ACESSORIO,
          ...(nome && leadExistente.name !== nome ? { name: nome } : {}),
        },
      ];
      await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
      console.log(`🔁 Lead ${leadExistente.id} atualizado para 'Acessório'`);
    } else {
      console.log("✅ Lead já está em 'Acessório'. Nenhuma ação necessária.");
    }
  } catch (err) {
    console.error("❌ Erro ao mover ou criar lead:", err.response?.data || err.message);
  }
}

async function criarLeadAcessorio(contactId, nome) {
  const payload = [
    {
      name: nome,
      status_id: STATUS_ACESSORIO,
      pipeline_id: PIPELINE_CLIENTES_VERTEX,
      _embedded: {
        contacts: [{ id: contactId }],
      },
    },
  ];

  const res = await axios.post(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
  const leadId = res.data._embedded?.leads?.[0]?.id;
  console.log("🆕 Lead criado para contato:", leadId);
  return leadId;
}

module.exports = { moverLeadParaClientesVertexAcessorio };

// Execução direta via terminal
if (require.main === module) {
  const telefone = process.argv[2];
  if (!telefone) {
    console.error("⚠️ Informe o número de telefone como argumento. Ex: node moverLeadParaClientesVertexAcessorio.js 5521983735922");
    process.exit(1);
  }
  moverLeadParaClientesVertexAcessorio(telefone);
}
