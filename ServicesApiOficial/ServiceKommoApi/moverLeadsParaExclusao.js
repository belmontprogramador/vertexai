const axios = require("axios");
require("dotenv").config();
const { getNomeUsuarioApiOficial } = require("../../Services/redisService");
const { normalizePhone } = require("../../Services/normalizePhone");

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const PIPELINE_ID = 7214739;
const STATUS_ID_LEADS_PARA_EXCLUSAO = 89406956;

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

async function moverLeadParaExclusao(telefoneSemMais) {
  try {
    const telefone = normalizePhone(telefoneSemMais);
    const nome = await getNomeUsuarioApiOficial(telefoneSemMais);
    console.log("📞 Número normalizado:", telefone);

    // Buscar contato
    const contatoResp = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts`, {
      headers,
      params: { query: telefone, with: "leads" },
    });

    let contato = contatoResp.data._embedded?.contacts?.[0];

    // Criar contato se não existir
    if (!contato) {
      const novoContatoPayload = [
        {
          name: nome || "Contato via WhatsApp",
          custom_fields_values: [
            {
              field_code: "PHONE",
              values: [{ value: telefone }],
            },
          ],
        },
      ];

      const { data: novoContatoData } = await axios.post(`${KOMMO_BASE_URL}/api/v4/contacts`, novoContatoPayload, { headers });
      contato = novoContatoData._embedded.contacts[0];
      console.log(`🆕 Contato criado: ID ${contato.id}`);
    }

    const leads = contato._embedded?.leads || [];

    if (leads.length === 0) {
      // Criar lead se não existir
      const novoLeadPayload = [
        {
          name: nome || "Novo Lead WhatsApp",
          pipeline_id: PIPELINE_ID,
          status_id: STATUS_ID_LEADS_PARA_EXCLUSAO,
          _embedded: {
            contacts: [{ id: contato.id }],
          },
        },
      ];

      await axios.post(`${KOMMO_BASE_URL}/api/v4/leads`, novoLeadPayload, { headers });
      console.log("🆕 Lead criado e movido para estágio de exclusão.");
      return;
    }

    // Atualizar leads existentes
    for (const l of leads) {
      const leadResp = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads/${l.id}`, { headers });
      const lead = leadResp.data;

      const precisaAtualizar =
        lead.pipeline_id !== PIPELINE_ID || lead.status_id !== STATUS_ID_LEADS_PARA_EXCLUSAO;

      if (precisaAtualizar) {
        const payload = [
          {
            id: lead.id,
            pipeline_id: PIPELINE_ID,
            status_id: STATUS_ID_LEADS_PARA_EXCLUSAO,
            ...(nome && lead.name !== nome ? { name: nome } : {}),
          },
        ];

        await axios.patch(`${KOMMO_BASE_URL}/api/v4/leads`, payload, { headers });
        console.log(`🔁 Lead ${lead.id} movido para 'leads para exclusão' no pipeline COMERCIAL VERTEX`);
      } else {
        console.log(`✅ Lead ${lead.id} já está no estágio correto.`);
      }
    }
  } catch (err) {
    console.error("❌ Erro ao mover/criar lead:", err.response?.data || err.message);
  }
}

module.exports = { moverLeadParaExclusao };

// Execução via terminal
if (require.main === module) {
  const telefone = process.argv[2];
  if (!telefone) {
    console.error("⚠️ Informe o número de telefone como argumento. Ex: node moverLeadParaExclusao.js 5521983735922");
    process.exit(1);
  }
  moverLeadParaExclusao(telefone);
}
