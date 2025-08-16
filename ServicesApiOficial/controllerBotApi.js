const {
    pausarBotParaUsuario,
    retomarBotParaUsuario,
  } = require("../Services/redisService");
  
  // 📌 POST /api/bot/oficial/pause
  exports.pausarBotApiOficial = async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ erro: "userId é obrigatório" });
  
    try {
      await pausarBotParaUsuario(userId);
      res.json({ sucesso: true, mensagem: `Bot pausado para ${userId}` });
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  };
  
  // 🔄 POST /api/bot/oficial/resume
  exports.retomarBotApiOficial = async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ erro: "userId é obrigatório" });
  
    try {
      await retomarBotParaUsuario(userId);
      res.json({ sucesso: true, mensagem: `Bot retomado para ${userId}` });
    } catch (err) {
      res.status(500).json({ erro: err.message });
    }
  };
  