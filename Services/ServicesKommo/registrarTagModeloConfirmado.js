const axios = require("axios");
require("dotenv").config();

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

/**
 * Registra uma tag no lead com base no modelo confirmado
 * @param {string} telefone - Telefone completo com DDI (ex: "5522981413041")
 * @param {string} nomeModelo - Nome do modelo confirmado
 */
async function registrarTagModeloConfirmado(telefone, nomeModelo) {
  const nomeTag = nomeModelo.toLowerCase();

  // 1. Busca o contato e leads
  const resContato = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts`, {
    headers,
    params: {
      query: telefone,
      with: "leads",
    },
  });

  const contato = resContato.data._embedded?.contacts?.[0];
  if (!contato) throw new Error("❌ Contato não encontrado no Kommo.");

  const leads = contato._embedded?.leads || [];
  const lead = leads[0];
  if (!lead) throw new Error("❌ Nenhum lead ativo encontrado para esse contato.");

  const leadId = lead.id;

  // 2. Busca todas as tags existentes
  const resTags = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads/tags`, {
    headers,
  });

  const tagExistente = resTags.data._embedded?.tags?.find(
    (t) => t.name.toLowerCase() === nomeTag
  );

  let tagId;
  if (!tagExistente) {
    const resNovaTag = await axios.post(
      `${KOMMO_BASE_URL}/api/v4/leads/tags`,
      [{ name: nomeTag }],
      { headers }
    );
    tagId = resNovaTag.data._embedded?.tags?.[0]?.id;
    console.log(`✅ Tag criada: ${nomeTag} (ID ${tagId})`);
  } else {
    tagId = tagExistente.id;
    console.log(`ℹ️ Tag já existe: ${nomeTag} (ID ${tagId})`);
  }

  // 3. Busca as tags já associadas ao lead
  const resLead = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads/${leadId}`, {
    headers,
  });

  const tagsAtuais = resLead.data._embedded?.tags || [];

  // 4. Garante que a nova tag não está duplicada
  const jaPossui = tagsAtuais.some((t) => t.id === tagId);
  if (jaPossui) {
    console.log(`⚠️ Lead ${leadId} já possui a tag ${nomeTag}.`);
    return;
  }

  // 5. Adiciona nova tag preservando as antigas (apenas IDs)
  const novasTags = [
    ...tagsAtuais.map((t) => ({ id: t.id })),
    { id: tagId },
  ];

  // 6. Atualiza o lead com as novas tags
  await axios.patch(
    `${KOMMO_BASE_URL}/api/v4/leads`,
    [
      {
        id: leadId,
        _embedded: {
          tags: novasTags,
        },
      },
    ],
    { headers }
  );

  console.log(`🏷️ Tag "${nomeTag}" associada ao lead ${leadId} com sucesso.`);
}

module.exports = { registrarTagModeloConfirmado };
