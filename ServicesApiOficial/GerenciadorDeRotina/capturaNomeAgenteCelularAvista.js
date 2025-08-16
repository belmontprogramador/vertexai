const { storeNomeUsuarioApiOficial, setUserStageApiOficial } = require("../../Services/redisService.js");
const { menuCelularAvista } = require("./menuCelular.js");

const capturaNomeAgenteCelularAvista = async (sender, msgContent) => {
  const nome = msgContent.trim();

  await storeNomeUsuarioApiOficial(sender, nome);
  await setUserStageApiOficial(sender, "aguardando_segmento_cliente");
  await menuCelularAvista(sender);
};

module.exports = { capturaNomeAgenteCelularAvista };
