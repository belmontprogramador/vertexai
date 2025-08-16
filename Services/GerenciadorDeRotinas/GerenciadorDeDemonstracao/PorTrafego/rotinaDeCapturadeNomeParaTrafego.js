const { sendBotMessage } = require("../../../messageSender");
const { setUserStage } = require("../../../redisService");

const rotinaDeCapturadeNomeParaTrafego  = async ({ sender, msgContent, pushName }) => {
  const frase1 =  "É um prazer ter você na Vertex 💜! Temos mais de 5 Mil clientes na Região do Lagos🏖️. "
  const frases = [
    `Seja bem-vindo(a)💜. Antes de continuarmos, me diz seu nome, por favor. Assim que enviar, já chamo nosso atendente pra seguir 😉`,
    `Seja bem-vindo(a)💜. Pra garantir um atendimento nota 10, me diz seu nome e já conecto você com nosso especialista 😉`,
  ];

  const fraseEscolhida = frases[Math.floor(Math.random() * frases.length)];  

  await sendBotMessage(sender, frase1)
  await sendBotMessage(sender, fraseEscolhida); 
  await setUserStage(sender, "agente_de_identificacao_de_nome_para_trafego");
};

module.exports = { rotinaDeCapturadeNomeParaTrafego  };
