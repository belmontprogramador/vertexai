const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;
const PIPELINE_ID = 11573376;

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listarLeadsComContatos() {
  let contatosComTelefone = [];
  let page = 1;

  while (true) {
    console.log(`📦 Buscando leads da página ${page}...`);

    const { data } = await axios.get(`${KOMMO_BASE_URL}/api/v4/leads`, {
      headers,
      params: {
        page,
        limit: 250,
        pipeline_id: PIPELINE_ID,
        with: "contacts",
      },
    });

    const leads = data?._embedded?.leads || [];
    if (leads.length === 0) break;

    for (const lead of leads) {
      const contato = lead._embedded?.contacts?.[0];
      if (!contato) continue;

      const nome = contato.name || "Sem nome";
      const campos = contato.custom_fields_values || [];

      const campoTelefone = campos.find(
        (f) => f.field_code === "PHONE" || f.field_id === 465480
      );

      const telefone = campoTelefone?.values?.[0]?.value;

      if (telefone) {
        contatosComTelefone.push({ nome, telefone });
      }
    }

    page++;
    await delay(1000); // 1s entre páginas
  }

  return contatosComTelefone;
}

listarLeadsComContatos()
  .then((dados) => {
    console.log("📈 Contatos encontrados:", dados.length);
    console.table(dados);

    const csvContent = [
      "nome,telefone",
      ...dados.map((d) => `"${d.nome}","${d.telefone}"`)
    ].join("\n");

    const filePath = path.join(__dirname, "contatos.csv");
    fs.writeFileSync(filePath, csvContent, "utf-8");

    console.log(`✅ Arquivo salvo em: ${filePath}`);
  })
  .catch((err) => {
    console.error("❌ Erro:", err.response?.data || err.message);
  });
