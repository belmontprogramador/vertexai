const axios = require("axios");
require("dotenv").config();

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

/**
 * Adiciona (ou cria) a tag "pipelineboletocliente" a um lead
 * @param {number} leadId - ID do lead no Kommo
 */
async function adicionarTagPipelineBoletoCliente(leadId) {
  const TAG_DESEJADA = "pipelineboletocliente";
  try {
    console.log(`🏷️ Buscando tags existentes no Kommo...`);
    const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads/tags?limit=250`, { headers });
    const todasTags = res.data._embedded?.tags || [];

    const tagExistente = todasTags.find(
      (tag) => tag.name?.trim().toLowerCase() === TAG_DESEJADA
    );

    let tagId;

    if (tagExistente) {
      tagId = tagExistente.id;
      console.log(`✅ Tag já existente: "${TAG_DESEJADA}" (ID: ${tagId})`);
    } else {
      console.log(`🆕 Criando nova tag: "${TAG_DESEJADA}"...`);
      const createTagRes = await axios.post(
        `${KOMMO_BASE_URL}/api/v4/leads/tags`,
        [{ name: TAG_DESEJADA }],
        { headers }
      );

      const novaTag = createTagRes.data?.[0] || createTagRes.data?._embedded?.tags?.[0];
      if (!novaTag) throw new Error("❌ Falha ao obter ID da nova tag criada.");

      tagId = novaTag.id;
      console.log(`🆕 Tag criada com sucesso: "${TAG_DESEJADA}" (ID: ${tagId})`);
    }

    // 🏷️ Adiciona a tag ao lead
    console.log(`📌 Adicionando tag "${TAG_DESEJADA}" ao lead ${leadId}...`);
    await axios.patch(
      `${KOMMO_BASE_URL}/api/v4/leads`,
      [
        {
          id: leadId,
          _embedded: {
            tags: [{ id: tagId }],
          },
        },
      ],
      { headers }
    );

    console.log(`✅ Tag "${TAG_DESEJADA}" adicionada com sucesso ao lead ${leadId}`);
  } catch (error) {
    console.error("❌ Erro ao adicionar tag:");
    if (error.response) {
      console.error("📥 Resposta da API:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("📛 Erro genérico:", error.message);
    }
  }
}

module.exports = { adicionarTagPipelineBoletoCliente };

// Execução via terminal
if (require.main === module) {
  const leadId = process.argv[2];
  if (!leadId) {
    console.error("⚠️ Informe o ID do lead como argumento. Ex: node adicionarTagPipelineBoletoCliente.js 12345678");
    process.exit(1);
  }

  adicionarTagPipelineBoletoCliente(Number(leadId));
}
