const { sendBotMessage } = require("../../messageSender");
const { agenteDeDefiniçãoDeSondagem } = require("../GerenciadorDeAbordagem/ServicesOpenAiAbordagem/openAiServicesAbordagem")

const rotinaDeRedirecionamentoDeAbordagem = async ({sender, msgContent, pushName }) => {

    await agenteDeDefiniçãoDeSondagem(sender, msgContent, pushName)

  return;
};

module.exports = { rotinaDeRedirecionamentoDeAbordagem };