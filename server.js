const app = require("./app");
const { remarketingFollowup } = require("./Services/crons/remarketingFollowup");
// const cron = require("node-cron");

const PORT = process.env.PORT || 3000;

// 🚀 Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// 🕒 Inicia o cron de remarketing a cada 30 minutos
// cron.schedule("*/30 * * * *", async () => {
//   console.log("🔁 Rodando cron de remarketing...");
//   await remarketingFollowup();
// });
