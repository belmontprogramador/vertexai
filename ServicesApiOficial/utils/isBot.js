const USER_AGENTS_BLOQUEADOS = [
    "facebookexternalhit",
    "Facebot",
    "WhatsApp",
    "Meta",
    "bot",
    "crawler",
    "Slackbot",
    "TelegramBot",
    "Discordbot"
  ];
  
  function isBot(userAgent) {
    return USER_AGENTS_BLOQUEADOS.some(ua =>
      (userAgent || "").toLowerCase().includes(ua.toLowerCase())
    );
  }
  
  module.exports = { isBot };
  