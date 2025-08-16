const app = require("./app");
const { remarketingFollowup } = require("./Services/Remarketing/remarketingFollowup");
const { moverContatosParados } = require("./Services/utils/movimentacaoDeCron/moverContatosParadosParaRemarketing"); 
const { moverLeadsBoletoEntre1e3Dias } = require("./Services/ServicesKommo/moverLeadsBoletoPipelineEntre1e3Dias")
 
const cron = require("node-cron");
const { jobRelatorioDiario } = require("./Services/ServiceBling/agenteRelatorioDiario"); 
const { jobRelatorioDoDia } = require("./Services/ServiceBling/agenteRelatorioDiarioDoDia");

const PORT = process.env.PORT || 3000;


// 🚀 Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// 🔁 Executa o remarketing leve a cada minuto
cron.schedule("* * * * *", async () => {
  console.log("🔁 Rodando cron de remarketingFollowup (cada 1 minuto)...");
  await remarketingFollowup();
});
 
 
// 06:00 - moverContatosParados (1 dia)
cron.schedule("0 6 * * *", async () => {
  console.log("🔁 Rodando cron moverContatosParados (1 dia)...");
  try {
    await moverContatosParados();
  } catch (error) {
    console.error("❌ Erro:", error.message);
  }
}, { timezone: "America/Sao_Paulo" });

 

cron.schedule("0 4 * * *", async () => {
  console.log("⏰ CRON 5h - Executando moverLeadsBoletoEntre1e3Dias...");
  await moverLeadsBoletoEntre1e3Dias();
}, { timezone: "America/Sao_Paulo" });

 

 