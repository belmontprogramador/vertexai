const app = require("./app");
const { remarketingFollowup } = require("./Services/Remarketing/remarketingFollowup");
const { moverContatosParados } = require("./Services/utils/movimentacaoDeCron/moverContatosParadosParaRemarketing");
const { moverContatosParadosParaTag } = require("./Services/utils/movimentacaoDeCron/moverContatosParadosParaTag");
const { moverContatosParadosParaLeadFrio } = require("./Services/ServicesKommo/moverContatosParadosParaLeadFrio");
const { moverContatosParadosBoleto } = require("./Services/utils/movimentacaoDeCron/moverContatosParadosBoleto");
const { moverContatosParadosParaTagBoleto } = require("./Services/utils/movimentacaoDeCron/moverContatosParadosParaTagBoleto");
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

// ⏰ Escalonamento sequencial das tarefas pesadas

// 06:00 - moverContatosParados (1 dia)
cron.schedule("0 6 * * *", async () => {
  console.log("🔁 Rodando cron moverContatosParados (1 dia)...");
  try {
    await moverContatosParados();
  } catch (error) {
    console.error("❌ Erro:", error.message);
  }
}, { timezone: "America/Sao_Paulo" });

// 07:00 - moverContatosParadosParaTag (3 dias)
cron.schedule("0 7 * * *", async () => {
  console.log("🔁 Rodando cron moverContatosParadosParaTag (3 dias)...");
  try {
    await moverContatosParadosParaTag();
  } catch (error) {
    console.error("❌ Erro:", error.message);
  }
}, { timezone: "America/Sao_Paulo" });

// 08:00 - moverContatosParadosParaLeadFrio
cron.schedule("0 8 * * *", async () => {
  console.log("🔁 Rodando cron moverContatosParadosParaLeadFrio...");
  try {
    await moverContatosParadosParaLeadFrio();
  } catch (error) {
    console.error("❌ Erro:", error.message);
  }
}, { timezone: "America/Sao_Paulo" });

// 09:00 - moverContatosParadosBoleto
cron.schedule("0 9 * * *", async () => {
  console.log("🔁 Rodando cron moverContatosParadosBoleto...");
  try {
    await moverContatosParadosBoleto();
  } catch (error) {
    console.error("❌ Erro:", error.message);
  }
}, { timezone: "America/Sao_Paulo" });

// 10:00 - moverContatosParadosParaTagBoleto
cron.schedule("0 10 * * *", async () => {
  console.log("🔁 Rodando cron moverContatosParadosParaTagBoleto...");
  try {
    await moverContatosParadosParaTagBoleto();
  } catch (error) {
    console.error("❌ Erro:", error.message);
  }
}, { timezone: "America/Sao_Paulo" });

// cron.schedule("* * * * *", async () => {
//   console.log("🔁 Rodando cron relatório diário de vendas...");
//   try {
//     await jobRelatorioDiario();
//   } catch (error) {
//     console.error("❌ Erro no cron relatório diário:", error);
//   }
// }, { timezone: "America/Sao_Paulo" });

// cron.schedule("* * * * *", async () => {
//   console.log("🔁 Rodando cron relatório diário de vendas...");
//   try {
//     await jobRelatorioDoDia();
//   } catch (error) {
//     console.error("❌ Erro no cron relatório diário:", error);
//   }
// }, { timezone: "America/Sao_Paulo" });