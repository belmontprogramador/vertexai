const {
  getModelosSugeridos,
  storeChosenModel,
  setUserStage
} = require("../../../redisService");

const { agenteDeDemonstracaoPorNome } = require("./agenteDeDemonstracaoPorNome");
const { sendBotMessage } = require("../../../messageSender");

const normalizar = (texto) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, "").toLowerCase();

const handlerEscolherModelo = async ({ sender, msgContent, pushName }) => {
  const entrada = normalizar(msgContent || "");
  const modelos = await getModelosSugeridos(sender);

  if (!modelos?.length) {
    return await sendBotMessage(sender, "❌ Não encontrei os modelos sugeridos. Pode repetir o nome completo?");
  }

  // Se usuário digitou "quero o 2", etc
  const numeroEscolhido = parseInt(entrada.match(/\d+/)?.[0]);
  if (numeroEscolhido && modelos[numeroEscolhido - 1]) {
    const escolhido = modelos[numeroEscolhido - 1];
    await storeChosenModel(sender, escolhido);
    await setUserStage(sender, "agente_de_demonstraçao_por_nome");
    return await agenteDeDemonstracaoPorNome({ sender, msgContent, pushName });
  }

  // Se mencionou nome diretamente
  const candidatos = modelos.filter(modelo =>
    normalizar(modelo).includes(entrada) || entrada.includes(normalizar(modelo))
  );

  if (candidatos.length === 1) {
    const escolhido = candidatos[0];
    await storeChosenModel(sender, escolhido);
    await setUserStage(sender, "agente_de_demonstraçao_por_nome");
    return await agenteDeDemonstracaoPorNome({ sender, msgContent, pushName });
  }

  return await sendBotMessage(sender, "❌ Não consegui identificar exatamente qual modelo você quer. Pode digitar o nome completo ou o número da opção?");
};

module.exports = { handlerEscolherModelo };
