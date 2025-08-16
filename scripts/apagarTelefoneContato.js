const axios = require("axios");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;
const TELEFONE_ALVO = "+5522998221985"; // número que deseja apagar

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

function normalizarTelefone(telefone) {
  return telefone.replace(/\D/g, "");
}

async function buscarContatoComCampoTelefone(telefoneAlvo) {
  const url = `${KOMMO_BASE_URL}/api/v4/contacts?query=${telefoneAlvo}`;
  const { data } = await axios.get(url, { headers });

  const telNormalizado = normalizarTelefone(telefoneAlvo);

  for (const contato of data._embedded.contacts) {
    const campoTelefone = contato.custom_fields_values?.find(f =>
      f.values?.some(v => normalizarTelefone(v.value) === telNormalizado)
    );

    if (campoTelefone) {
      return {
        contatoId: contato.id,
        fieldIdTelefone: campoTelefone.field_id,
      };
    }
  }

  throw new Error("Contato com telefone informado não encontrado.");
}

async function apagarTelefoneDoContato(contatoId, fieldIdTelefone) {
  const url = `${KOMMO_BASE_URL}/api/v4/contacts`;

  const payload = [
    {
      id: contatoId,
      custom_fields_values: [
        {
          field_id: fieldIdTelefone,
          values: [{ value: "" }],
        },
      ],
    },
  ];

  const { data } = await axios.patch(url, payload, { headers });
  console.log("✅ Telefone apagado com sucesso!", data);
}

async function main() {
  try {
    const { contatoId, fieldIdTelefone } = await buscarContatoComCampoTelefone(TELEFONE_ALVO);
    await apagarTelefoneDoContato(contatoId, fieldIdTelefone);
  } catch (error) {
    console.error("❌ Erro:", error.response?.data || error.message);
  }
}

main();
