// services/blingProductByCategoryService.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { gerarNovoAccessToken } = require('../ServiceBling/blingTokenRefreshService.js'); // ✅ importa função de refresh

const REFRESH_TOKEN_PATH = path.resolve(__dirname, '../../bling_refresh_token.json');
const CATEGORIA_ID = 11356816;

const getAccessToken = async () => {
  if (!fs.existsSync(REFRESH_TOKEN_PATH)) {
    throw new Error('Arquivo bling_refresh_token.json não encontrado.');
  }

  const data = JSON.parse(fs.readFileSync(REFRESH_TOKEN_PATH, 'utf8'));

  // ⏰ Verifica se o token expirou
  const expirado = !data.expires_at || Date.now() >= data.expires_at;
  if (expirado) {
    console.log("🔁 Token expirado. Gerando novo...");
    await gerarNovoAccessToken(); // 🔄 gera novo token
    const novo = JSON.parse(fs.readFileSync(REFRESH_TOKEN_PATH, 'utf8'));
    return novo.access_token;
  }

  return data.access_token;
};

const buscarProdutosPorCategoria = async () => {
  try {
    const token = await getAccessToken();

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
      .filter(produto => produto.estoque?.saldoVirtualTotal > 0)
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
