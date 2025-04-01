const { sendBotMessage } = require("../../messageSender");
const {
  getLastInteraction,
  setLastInteraction,
  storeUserMessage,
  getStageHistory   
} = require("../../redisService");   
const { rotinaDeDemonstracao } = require("../GerenciadorDeDemonstracao/rotinaDeDemonstracao");
const { rotinaDeAtedimentoInicial } = require("./rotinaDeAtedimentoInicial");

const rotinaDeContinuidade = async (sender, msgContent, pushName) => {
  const cleanedContent = msgContent.replace(/^again\s*/i, "").trim().toLowerCase();
  const lastInteraction = await getLastInteraction(sender);
  const currentTime = Date.now();
  const CHECK_TIME_LIMIT = 1 * 60 * 1000;

  await setLastInteraction(sender, currentTime);
  await storeUserMessage(sender, cleanedContent);

  // Recupera os dois últimos estágios do histórico
  const  stage  = await getStageHistory(sender);
   

  console.log(`🧭 [DEBUG] Stage anterior mais antigo recuperado na continuidade: ${stage}`);

  const responseMessage = "Perfeito! Vamos continuar de onde paramos 😄";
  await sendBotMessage(sender, responseMessage);

  switch (novoStage) {
    case "primeiro_atendimento":
        return await rotinaDeAtedimentoInicial(sender, msgContent, pushName);

    case "reinicio_de_atendimento":
        return await rotinaDeReincioAtedimento(sender, msgContent, pushName);

    case "abordagem":
        return await rotinaDeAbordagem({ sender, msgContent, pushName });

    case "sequencia_de_abordagem":
        return await rotinaDeRedirecionamentoDeAbordagem({ sender, msgContent, pushName });

    case "sequencia_de_atendimento":
        return await rotinaDeSondagemDeCelular({ sender, msgContent, pushName });

    case "sondagem_de_celular":
        await sendBotMessage(sender, "Perfeito! Vamos retomar seu atendimento 😄");
        return await rotinaDeSondagemDeCelular({ sender, msgContent, pushName });

    case "sondagem_de_acessorios":
            await sendBotMessage(sender, "Perfeito! Vamos retomar seu atendimento 😄");
            return await rotinaDeSondagemDeAcessorios({ sender, msgContent, pushName });

    case "agente_de_fechamento_de_sondagem": 
        const respostas = await getUserResponses(sender, "sondagem");

        const produto = respostas.pergunta_1;
        const finalidadeUso = respostas.pergunta_2;
        const investimento = respostas.pergunta_3;  
        console.log(produto, finalidadeUso, investimento)         
        return await agenteDeFechamentoSondagem(sender, msgContent, produto, finalidadeUso, investimento, pushName);

    case "sequencia_de_demonstracao":
        return await rotinaDeDemonstracao({ sender, msgContent, produto, finalidadeUso, investimento, pushName });

    case "continuar_de_onde_parou":
        return await rotinaDeContinuidade(sender, msgContent, pushName);

    default:
        console.log("⚠️ [DEBUG] Nenhum stage válido encontrado.");
        return await sendBotMessage(sender, "Não consegui identificar seu estágio 😕");
}
};

module.exports = { rotinaDeContinuidade };
