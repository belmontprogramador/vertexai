const { sendBotMessage } = require("../../messageSender");

async function rotinaCapturaDeNomeParaMegafeirao(sender) {
  const mensagem = `
💟 *MEGA FEIRÃO DOS CELULARES - VERTEX STORE* 💟

➡️ *INFINIX*

📲 *INFINIX SMART 9* - 128/4GB RAM - *SEM NFC*  
💰 R$ *799,00* À VISTA ou 10x *84,90* no cartão

➡️ *REALME*

📲 *REALME C61* - 256GB / 8GB RAM - *COM NFC* 🔥  
💰 R$ *1.180,00* À VISTA ou 10x *127,00* no cartão

📲 *REALME C75* - 256GB / 8GB RAM - *COM NFC*  
💰 R$ *1.499,00* À VISTA ou 10x *162,00* no cartão

➡️ *XIAOMI*

📲 *NOTE 14* - 256GB / 8GB RAM - *SEM NFC*  
💰 R$ *1.410,00* À VISTA ou 10x *149,00* no cartão

📲 *REDMI NOTE 14 PRO* (5G) - 256GB / 8GB RAM - *COM NFC*  
💰 R$ *2.145,00* À VISTA ou 10x *229,00* no cartão

📲 *REDMI NOTE 14 PRO PLUS* (5G) - 512GB / 12GB RAM - *COM NFC*  
💰 R$ *2.999,00* À VISTA ou 10x *315,00* no cartão

📲 *POCO X7* - 256GB / 8GB RAM - *COM NFC*  
💰 R$ *1.950,00* À VISTA ou 10x *210,00* no cartão

📲 *POCO X7* - 512GB / 12GB RAM - *COM NFC*  
💰 R$ *2.145,00* À VISTA ou 10x *229,99* no cartão

📲 *POCO X7 PRO* - 512GB / 12GB RAM - *COM NFC*  
💰 R$ *2.800,00* À VISTA ou 10x *297,00* no cartão

🏬 *Loja Física* - Centro de Araruama  
📍 *Av. Getúlio Vargas, 333 - Loja 6B*  
🎖️ Produtos com *Garantia*  
📲 Redes sociais: @VERTEXSTOREBR
`;

  await sendBotMessage(sender, mensagem);
  return  await sendBotMessage(sender, "um minuto");
}

module.exports = { rotinaCapturaDeNomeParaMegafeirao}
