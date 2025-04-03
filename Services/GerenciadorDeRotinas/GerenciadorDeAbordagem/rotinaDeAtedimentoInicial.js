const { sendBotMessage } = require("../../messageSender");
const { setUserStage } = require("../../redisService");
const { rotinaDeAbordagem } = require("../GerenciadorDeAbordagem/rotinaDeAbordagem");

const rotinaDeAtedimentoInicial = async (sender, msgContent, pushName) => {   
   

  return await rotinaDeAbordagem({sender, msgContent, pushName })
};

module.exports = { rotinaDeAtedimentoInicial };
