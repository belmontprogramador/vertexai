const { storeNomeUsuarioApiOficial, setUserStageApiOficial } = require("../../Services/redisService");
const { menuAcessorio } = require("../GerenciadorDeRotina/menuCelular");


const capturaNomeAgenteAcessorio = async (sender, msgContent) => {
  const nome = msgContent.trim(); 

  await storeNomeUsuarioApiOficial(sender, nome);
  await setUserStageApiOficial(sender, "aguardando_segmento_cliente");
await menuAcessorio(sender)
     
};

module.exports = { capturaNomeAgenteAcessorio };
