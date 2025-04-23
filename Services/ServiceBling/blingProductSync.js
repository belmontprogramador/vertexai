// services/blingTokenRefreshService.js
const axios = require('axios');
const fs = require('fs');
const cron = require('node-cron');
require('dotenv').config();

const CLIENT_ID = process.env.BLING_CLIENT_ID;
const CLIENT_SECRET = process.env.BLING_CLIENT_SECRET;
const REFRESH_TOKEN_PATH = './bling_refresh_token.json';

const gerarNovoAccessToken = async () => {
  try {
    if (!fs.existsSync(REFRESH_TOKEN_PATH)) {
      console.error('❌ Arquivo de refresh token não encontrado.');
      return;
    }

    const { refresh_token: currentRefreshToken } = JSON.parse(fs.readFileSync(REFRESH_TOKEN_PATH, 'utf8'));

    const body = new URLSearchParams();
    body.append('grant_type', 'refresh_token');
    body.append('refresh_token', currentRefreshToken);

    const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

    const response = await axios.post('https://www.bling.com.br/Api/v3/oauth/token', body.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      }
    });

    const { access_token, refresh_token, expires_in } = response.data;

    fs.writeFileSync(REFRESH_TOKEN_PATH, JSON.stringify({
      access_token,
      refresh_token,
      expires_at: Date.now() + expires_in * 1000
    }, null, 2));

    console.log(`[${new Date().toLocaleString()}] ✅ Novo access token gerado e salvo.`);
  } catch (err) {
    console.error(`[${new Date().toLocaleString()}] ❌ Erro ao gerar novo token:`, err.response?.data || err.message);
  }
};

// ⏰ Executa automaticamente a cada 5 horas
cron.schedule('0 */5 * * *', () => {
  console.log(`[${new Date().toLocaleString()}] 🔄 Iniciando renovação automática do access token...`);
  gerarNovoAccessToken();
});

// Execução inicial imediata
gerarNovoAccessToken();