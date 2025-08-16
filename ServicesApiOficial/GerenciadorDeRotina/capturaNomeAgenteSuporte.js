const { storeNomeUsuarioApiOficial, setUserStageApiOficial } = require("../../Services/redisService");
const { menuSuporte } = require("../GerenciadorDeRotina/menuCelular");

const capturaNomeAgenteSuporte = async (sender, msgContent) => {
  const nome = msgContent.trim();

  await storeNomeUsuarioApiOficial(sender, nome);
  await setUserStageApiOficial(sender, "aguardando_segmento_cliente");
  await menuSuporte(sender);
};

module.exports = { capturaNomeAgenteSuporte };
