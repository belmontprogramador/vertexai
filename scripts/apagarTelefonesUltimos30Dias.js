const axios = require("axios");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;
const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
  Accept: "application/hal+json",
};

const TELEFONE_FIELD_CODE = "PHONE";

function getTimestamp30DiasAtras() {
  const MS_30_DIAS = 1000 * 60 * 60 * 24 * 30;
  return Math.floor((Date.now() - MS_30_DIAS) / 1000);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizarTelefone(telefone) {
  return telefone.replace(/\D/g, "");
}

async function listarTodosContatosMais30Dias() {
  let page = 1;
  const limit = 50;
  const contatos = [];
  const createdBefore = getTimestamp30DiasAtras();

  while (true) {
    const params = {
      page,
      limit,
      "filter[created_at][to]": createdBefore,
      with: "leads",
    };

    const res = await axios.get(`${KOMMO_BASE_URL}/api/v4/contacts`, { headers, params });
    const pageContatos = res.data._embedded?.contacts || [];

    if (!pageContatos.length) break;

    contatos.push(...pageContatos);
    console.log(`📦 Página ${page} carregada (${pageContatos.length} contatos)`);
    page++;
    const DELAY_ENTRE_PAGINAS_MS = 3000;// pequeno delay entre páginas
    await delay(DELAY_ENTRE_PAGINAS_MS);

  }

  return contatos;
}

async function apagarTelefoneContato(contato) {
  const fieldTelefone = contato.custom_fields_values?.find(f => f.field_code === TELEFONE_FIELD_CODE);

  if (!fieldTelefone || !fieldTelefone.field_id) {
    console.log(`⚠️ Contato ID ${contato.id} não possui campo de telefone válido`);
    return;
  }

  const payload = [
    {
      id: contato.id,
      custom_fields_values: [
        {
          field_id: fieldTelefone.field_id,
          values: [{ value: "" }],
        },
      ],
    },
  ];

  try {
    await axios.patch(`${KOMMO_BASE_URL}/api/v4/contacts`, payload, { headers });

    const dataCriacao = new Date(contato.created_at * 1000).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    console.log(`✅ Telefone apagado: ${contato.name || "(sem nome)"} | ID: ${contato.id} | Criado em: ${dataCriacao}`);
  } catch (error) {
    const dataErro = error.response?.data || error.message;
    const detalhes = dataErro?.["validation-errors"]?.[0]?.errors?.map(e => e.detail).join(" | ");
    console.error(`❌ Erro ao apagar telefone do contato ID ${contato.id}:\n`, detalhes || dataErro);
  }
}

async function processar() {
  const contatos = await listarTodosContatosMais30Dias();

  if (!contatos.length) {
    console.log("⚠️ Nenhum contato com mais de 30 dias encontrado.");
    return;
  }

  console.log(`🚀 Iniciando processo para ${contatos.length} contatos...\n`);

  for (const contato of contatos) {
    await apagarTelefoneContato(contato);
    console.log("⏳ Aguardando 40 segundos...");
    await delay(40000);
  }

  console.log("✅ Processo concluído.");
}

processar();
