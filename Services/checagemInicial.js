const { validarFluxoInicial } = require("../Services/ValidacaoDeResposta/CentralDeValidacoes");
const { rotinaDeReincioAtedimento } = require("../Services/GerenciadorDeRotinas/GerenciadorDeAbordagem/rotinaDeReinicioAtendimento");
const { rotinaDeSondagemDeCelular } = require("./GerenciadorDeRotinas/GerenciadorDeSondagem/rotinaDeSondagemDeCelular");
const { rotinaDeRedirecionamentoDeAbordagem } = require("../Services/GerenciadorDeRotinas/GerenciadorDeAbordagem/rotinaDeRedirecionamentoDeAbordagem");
const { rotinaDeDemonstracao } = require("../Services/GerenciadorDeRotinas/GerenciadorDeDemonstracao/rotinaDeDemonstracao"); 
const { rotinaDeAtedimentoInicial } = require("./GerenciadorDeRotinas/GerenciadorDeAbordagem/rotinaDeAtedimentoInicial");
const { agenteDeFechamentoSondagem } = require("../Services/GerenciadorDeRotinas/GerenciadorDeSondagem/ServicesOpenAiSondagem/openAiServicesFechamentoDeSondagem")
const { rotinaDeContinuidade } = require("./GerenciadorDeRotinas/GerenciadorDeAbordagem/rotinaDeContinuidade");
const { rotinaDeAbordagem } = require("./GerenciadorDeRotinas/GerenciadorDeAbordagem/rotinaDeAbordagem")
const { rotinaDeAgendamento } = require("../Services/GerenciadorDeRotinas/GerenciamentoDeAgendamento/rotinaDeAgendamento");
const { rotinaDeBoleto } = require("../Services/GerenciadorDeRotinas/GerenciadordeBoleto/rotinaDeBoleto")
const { rotinaDeSondagemDeAcessorios} = require("./GerenciadorDeRotinas/GerenciadorDeSondagem/rotinaDeSondagemAcessorios");
const { setarReset } = require('../Services/ValidacaoDeResposta/validadorDeReset')
const { sendBotMessage } = require("./messageSender");
const { setUserStage, getUserResponses,redis, } = require('./redisService')

const checagemInicial = async (sender, msgContent, pushName) => {
    const cleanedContent = msgContent.replace(/^again\s*/i, "").trim().toLowerCase();

    let novoStage;

    if (cleanedContent === "resetardados") {
        await setarReset(sender, msgContent)
        novoStage = "primeiro_atendimento"
        console.log(`🎯 [DEBUG] Executando switch para stage: ${novoStage}`);
        return;
    } else {
        novoStage = await validarFluxoInicial(sender, msgContent, pushName);
        console.log(`🎯 [DEBUG] Executando switch para stage: ${novoStage}`);
    }

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

        case "boleto":             
            return await rotinaDeBoleto({ sender, msgContent, pushName });

        case "agendamento":             
            return await rotinaDeAgendamento({ sender, msgContent, pushName });

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

module.exports = { checagemInicial };
