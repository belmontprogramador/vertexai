const axios = require('axios');
const qs = require('qs');
const fs = require('fs');
require('dotenv').config();

async function gerarTokens() {
  try {
    const response = await axios.post(
      'https://api.bling.com.br/oauth/token',
      qs.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.BLING_CLIENT_ID,
        client_secret: process.env.BLING_CLIENT_SECRET,
        code: '314c5dc3451b70632ba745e70a23138b53fe29b2',
        redirect_uri: 'https://felipebelmont.com'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    // Salva no JSON local
    fs.writeFileSync('bling_refresh_token.json', JSON.stringify({
      access_token,
      refresh_token,
      expires_at: Date.now() + expires_in * 1000
    }, null, 2));

    console.log('✅ Tokens gerados e salvos em bling_refresh_token.json');
  } catch (error) {
    console.error('❌ Erro ao gerar tokens:', error.response?.data || error.message);
  }
}

gerarTokens();
