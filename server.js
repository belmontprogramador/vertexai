const app = require("./app");
const { remarketingFollowup } = require("./Services/Remarketing/remarketingFollowup");
const cron = require("node-cron");

const PORT = process.env.PORT || 3000;

// 🚀 Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// 🕒 Executa o remarketing a cada 1 minuto
cron.schedule("* * * * *", async () => {
  console.log("🔁 Rodando cron de remarketing...");
  await remarketingFollowup();
});
