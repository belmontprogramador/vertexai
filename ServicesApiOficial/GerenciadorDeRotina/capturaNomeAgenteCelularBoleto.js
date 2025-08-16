const { storeNomeUsuarioApiOficial, setUserStageApiOficial } = require("../../Services/redisService.js");
const { menuCelularBoleto } = require("./menuCelular.js");

const capturaNomeAgenteCelularBoleto = async (sender, msgContent) => {
  const nome = msgContent.trim();

  await storeNomeUsuarioApiOficial(sender, nome);
  await setUserStageApiOficial(sender, "aguardando_segmento_cliente");
  await menuCelularBoleto(sender);
};

module.exports = { capturaNomeAgenteCelularBoleto };
