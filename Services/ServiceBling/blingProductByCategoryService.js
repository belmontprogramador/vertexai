// services/blingProductByCategoryService.js
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const REFRESH_TOKEN_PATH = './bling_refresh_token.json';
const CATEGORIA_ID = 11356816;

const getAccessToken = () => {
  if (!fs.existsSync(REFRESH_TOKEN_PATH)) {
    throw new Error('Arquivo bling_refresh_token.json não encontrado.');
  }
  const data = JSON.parse(fs.readFileSync(REFRESH_TOKEN_PATH, 'utf8'));
  return data.access_token;
};

const buscarProdutosPorCategoria = async () => {
  try {
    const token = getAccessToken();

    const response = await axios.get('https://www.bling.com.br/Api/v3/produtos', {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        idCategoria: CATEGORIA_ID,
        pagina: 1,
        limite: 100
      }
    });

    return response.data.data
      .filter(produto => produto.estoque?.saldoVirtualTotal > 0) // ✅ só produtos com estoque
      .map(produto => ({
        nome: produto.nome,
        preco: produto.preco || 0,
        descricao: produto.descricaoCurta || "Sem descrição detalhada.",
        imagem: produto.imagemURL || null,
        estoque: produto.estoque.saldoVirtualTotal
      }));

  } catch (err) {
    console.error(`[${new Date().toLocaleString()}] ❌ Erro ao buscar produtos:`, err.response?.data || err.message);
    return [];
  }
};

module.exports = { buscarProdutosPorCategoria };
