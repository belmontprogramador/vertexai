const cron = require('node-cron');
const { buscarVendasPorVendedor } = require('./blingVendasPorVendedorService');

// Executa todo dia às 8h
cron.schedule('0 8 * * *', async () => {
  console.log(`⏰ Iniciando relatório de vendas por vendedor às ${new Date().toLocaleTimeString()}`);
  await buscarVendasPorVendedor();
}, {
  timezone: 'America/Sao_Paulo'
});
