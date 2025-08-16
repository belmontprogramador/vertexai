// // controller/webhookKommoController.js
// const {
//     pausarBotParaUsuario,
//     retomarBotParaUsuario,
//     isBotPausadoParaUsuario,
//   } = require("../Services/redisService");
  
//   exports.webhookKommo = async (req, res) => {
//     try {
//       // 🧪 Log completo do payload recebido (mesmo que inválido)
//       console.log("📦 Webhook Kommo recebido:", JSON.stringify(req.body, null, 2));
  
//       const message = req.body?.message || {};
//       const user = req.body?.user || {};
  
//       const texto = message?.text?.toLowerCase()?.trim();
//       const cliente = message?.chat_id;
  
//       // ✅ Continua executando o bot normalmente se estrutura válida
//       if (texto && cliente) {
//         if (texto === "pausar bot") {
//           await pausarBotParaUsuario(cliente);
//           console.log(`⏸️ Bot pausado via Kommo para o cliente ${cliente} por ${user?.name}`);
//           return res.sendStatus(200);
//         }
  
//         if (texto === "retomar bot") {
//           await retomarBotParaUsuario(cliente);
//           console.log(`▶️ Bot retomado via Kommo para o cliente ${cliente} por ${user?.name}`);
//           return res.sendStatus(200);
//         }
  
//         if (texto === "status bot") {
//           const pausado = await isBotPausadoParaUsuario(cliente);
//           console.log(`ℹ️ Status do bot para ${cliente}: ${pausado ? "⏸️ Pausado" : "✅ Ativo"}`);
//           return res.sendStatus(200);
//         }
  
//         console.log(`📨 Kommo enviou: "${texto}" para ${cliente} (sem ação especial)`);
//         return res.sendStatus(200);
//       }
  
//       // ⚠️ Estrutura inesperada, mas ainda assim processamos e registramos
//       console.warn("⚠️ Webhook recebido sem texto ou cliente válido.");
//       return res.sendStatus(200); // Respondemos 200 mesmo sem ação, para não gerar falha na Kommo
//     } catch (err) {
//       console.error("❌ Erro no webhookKommo:", err);
//       return res.sendStatus(500);
//     }
//   };
  