const { validarFluxoInicial } = require("../Services/ValidacaoDeResposta/CentralDeValidacoes");
const { rotinaDeReincioAtedimento } = require("../Services/GerenciadorDeRotinas/GerenciadorDeAbordagem/rotinaDeReinicioAtendimento");
const { rotinaDeSondagem } = require("../Services/GerenciadorDeRotinas/GerenciadorDeSondagem/rotinaDeSondagem");
const { rotinaDeDemonstracao } = require("../Services/GerenciadorDeRotinas/GerenciadorDeDemonstracao/rotinaDeDemonstracao");
const { rotinaDeAtedimentoInicial } = require("./GerenciadorDeRotinas/GerenciadorDeAbordagem/rotinaDeAtedimentoInicial");
const { rotinaDeContinuidade } = require("../Services/GerenciadorDeRotinas/GerenciadorDeAbordagem/rotinaDeContinuidade");
const { setarReset } = require('../Services/ValidacaoDeResposta/validadorDeReset')
const { sendBotMessage } = require("./messageSender");
const { setUserStage, redis,  } = require('./redisService')

const checagemInicial = async (sender, msgContent, pushName) => {
  const cleanedContent = msgContent.replace(/^again\s*/i, "").trim().toLowerCase();

  let novoStage;

if (cleanedContent === "resetardados") {         
    await setarReset(sender, msgContent)   
    novoStage = "primeiro_atendimento"
    console.log(`🎯 [DEBUG] Executando switch para stage: ${novoStage}`); 
} else {
    novoStage = await validarFluxoInicial(sender, msgContent, pushName);
    console.log(`🎯 [DEBUG] Executando switch para stage: ${novoStage}`);
}
 

  switch (novoStage) {
    case "primeiro_atendimento":
      return await rotinaDeAtedimentoInicial(sender, msgContent, pushName);

    case "reinicio_de_atendimento":
      return await rotinaDeReincioAtedimento(sender, msgContent, pushName);

    case "sondagem":
      await sendBotMessage(sender, "Perfeito! Vamos retomar seu atendimento 😄");
      return await rotinaDeSondagem({ sender, msgContent, pushName });

    case "sequencia_de_atendimento":
      return await rotinaDeSondagem({ sender, msgContent, pushName });

    case "sequencia_de_demonstracao":
      return await rotinaDeDemonstracao(sender, msgContent, pushName);

    case "continuar_de_onde_parou":
      return await rotinaDeContinuidade(sender, msgContent, pushName);

    default:
      console.log("⚠️ [DEBUG] Nenhum stage válido encontrado.");
      return await sendBotMessage(sender, "Não consegui identificar seu estágio 😕");
  }
};

module.exports = { checagemInicial };
