const axios = require('axios');
require('dotenv').config(); // carrega variáveis do .env

const INSTANCE_ID = process.env.INSTANCE_ID;
const TOKEN = process.env.TOKEN;
const BASE_URL = `https://api.w-api.app/v1/contacts/phone-exists-batch?instanceId=${INSTANCE_ID}`;

function dividirEmLotes(array, tamanho) {
  const lotes = [];
  for (let i = 0; i < array.length; i += tamanho) {
    lotes.push(array.slice(i, i + tamanho));
  }
  return lotes;
}

const validarNumerosEmLoteController = async (req, res) => {
  const { phones } = req.body;

  if (!Array.isArray(phones) || phones.length === 0) {
    return res.status(400).json({ erro: 'Envie um array de números no formato { phones: [...] }' });
  }

  const lotes = dividirEmLotes(phones, 50);
  const resultados = [];

  for (const lote of lotes) {
    try {
      const resposta = await axios.post(
        BASE_URL,
        { phones: lote },
        {
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      resultados.push(...resposta.data);
    } catch (error) {
        console.error('Erro ao validar lote:', error.response?.data || error.message);
        resultados.push(...lote.map(phone => ({ phone, exists: null, erro: true })));
      }
  }

  return res.json(resultados);
};

module.exports = { validarNumerosEmLoteController };
