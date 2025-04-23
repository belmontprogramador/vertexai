const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const CLIENT_ID = process.env.BLING_CLIENT_ID;
const CLIENT_SECRET = process.env.BLING_CLIENT_SECRET;
const REFRESH_TOKEN_PATH = './bling_refresh_token.json';

const refreshToken = async (req, res) => {
  try {
    // Verifica e lê o arquivo com o refresh_token atual
    if (!fs.existsSync(REFRESH_TOKEN_PATH)) {
      return res.status(400).json({ error: 'Arquivo bling_refresh_token.json não encontrado.' });
    }

    const { refresh_token: currentRefreshToken } = JSON.parse(fs.readFileSync(REFRESH_TOKEN_PATH, 'utf8'));

    // Prepara o corpo da requisição com form-urlencoded
    const body = new URLSearchParams();
    body.append('grant_type', 'refresh_token');
    body.append('refresh_token', currentRefreshToken);

    // Gera o Authorization manualmente (Base64)
    const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

    // Faz a requisição para renovar o token
    const response = await axios.post('https://www.bling.com.br/Api/v3/oauth/token', body.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      }
    });

    const { access_token, refresh_token, expires_in } = response.data;

    // Salva o novo token e refresh_token
    fs.writeFileSync(REFRESH_TOKEN_PATH, JSON.stringify({
      access_token,
      refresh_token,
      expires_at: Date.now() + expires_in * 1000
    }, null, 2));

    console.log(`[${new Date().toLocaleString()}] ✅ Novo token salvo com sucesso.`);
    return res.status(200).json({ access_token, refresh_token });
  } catch (err) {
    console.error(`[${new Date().toLocaleString()}] ❌ Erro ao renovar token:`, err.response?.data || err.message);
    return res.status(500).json({ error: err.response?.data || err.message });
  }
};

module.exports = { refreshToken };
