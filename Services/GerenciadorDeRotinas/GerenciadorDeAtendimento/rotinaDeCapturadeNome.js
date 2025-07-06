const { sendBotMessage } = require("../../messageSender");
const { setUserStage } = require("../../redisService");

const rotinaDeCapturadeNome  = async ({ sender, msgContent, pushName }) => {
  const frases = [
    `Oi! Seja bem-vindo(a) à Vertex Store 💜. Antes de continuarmos, me diz seu nome, por favor. Assim que enviar, já chamo nosso atendente pra seguir 😉`,
    `E aí! Você chegou à Vertex Store 💜. Pra garantir um atendimento nota 10, me diz seu nome e já conecto você com nosso especialista 😉`,
  ];

  const fraseEscolhida = frases[Math.floor(Math.random() * frases.length)];  

  await sendBotMessage(sender, fraseEscolhida); 
  await setUserStage(sender, "agente_de_identificacao_de_nome");
};

module.exports = { rotinaDeCapturadeNome  };
