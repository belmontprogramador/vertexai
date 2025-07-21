const axios = require("axios");
require("dotenv").config();

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

/**
 * Adiciona ou cria uma tag com o mês e ano atual no lead
 * @param {number} leadId - ID do lead no Kommo
 */
async function adicionarOuCriarTagPorDataAtual(leadId) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const [dia, mes, ano] = formatter.formatToParts(new Date())
    .reduce((acc, part) => {
      if (part.type === "day") acc[0] = part.value;
      if (part.type === "month") acc[1] = part.value;
      if (part.type === "year") acc[2] = part.value;
      return acc;
    }, []);
  
  const mesAno = `${MESES_PT[parseInt(mes, 10) - 1]} ${ano}`.toLowerCase();
  

  console.log(`🛠️ Iniciando adicionarOuCriarTagPorDataAtual para lead ${leadId}`);
  console.log(`📅 Tag gerada: "${mesAno}"`);

  try {
    // 🔍 1. Buscar todas as tags existentes
    console.log("🔄 Buscando tags existentes no Kommo...");
    const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads/tags?limit=250`, { headers });
    const todasTags = res.data._embedded?.tags || [];
    console.log(`🔎 Total de tags recebidas: ${todasTags.length}`);

    // 🔍 2. Verifica se já existe tag com nome igual
    const tagExistente = todasTags.find(tag =>
      tag.name?.trim().toLowerCase() === mesAno
    );

    let tagId;

    if (tagExistente) {
      console.log(`✅ Tag já existente: "${mesAno}" (ID: ${tagExistente.id})`);
      tagId = tagExistente.id;
    } else {
      // ✏️ 3. Cria a tag se não existir
      console.log(`🆕 Criando nova tag: "${mesAno}"...`);
      const createTagRes = await axios.post(
        `${KOMMO_BASE_URL}/api/v4/leads/tags`,
        [{ name: mesAno }],
        { headers }
      );

      const novaTag = createTagRes.data?.[0] || createTagRes.data?._embedded?.tags?.[0];
      if (!novaTag) throw new Error("❌ Falha ao obter ID da nova tag criada.");

      tagId = novaTag.id;
      console.log(`🆕 Tag criada com sucesso: "${mesAno}" (ID: ${tagId})`);
    }

    // 🏷️ 4. Adiciona a tag ao lead via PATCH
console.log(`🏷️ Adicionando tag ID ${tagId} ao lead ${leadId}...`);
await axios.patch(
  `${KOMMO_BASE_URL}/api/v4/leads`,
  [
    {
      id: leadId,
      _embedded: {
        tags: [{ id: tagId }]
      }
    }
  ],
  { headers }
);

    
    
    

    console.log(`✅ Tag "${mesAno}" adicionada com sucesso ao lead ${leadId}`);
  } catch (error) {
    console.error("❌ Erro ao criar ou adicionar tag:");
    if (error.response) {
      console.error("📥 Resposta da API:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("📛 Erro genérico:", error.message);
    }
    console.error("📌 Stack:", error.stack);
  }
}

module.exports = { adicionarOuCriarTagPorDataAtual };
