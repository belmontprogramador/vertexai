const { validarFluxoInicial } = require("../Services/ValidacaoDeResposta/CentralDeValidacoes");
const { rotinaDeReincioAtedimento } = require("../Services/GerenciadorDeRotinas/GerenciadorDeAbordagem/rotinaDeReinicioAtendimento");
const { rotinaDeSondagemDeCelular } = require("./GerenciadorDeRotinas/GerenciadorDeSondagem/rotinaDeSondagemDeCelular");
const { rotinaDeRedirecionamentoDeAbordagem } = require("../Services/GerenciadorDeRotinas/GerenciadorDeAbordagem/rotinaDeRedirecionamentoDeAbordagem");
const { rotinaDeDemonstracao } = require("../Services/GerenciadorDeRotinas/GerenciadorDeDemonstracao/rotinaDeDemonstracao"); 
const { rotinaDeAtedimentoInicial } = require("./GerenciadorDeRotinas/GerenciadorDeAbordagem/rotinaDeAtedimentoInicial");
const { compactadorDeSuporte } = require("../Services/GerenciadorDeRotinas/GerenciadorDeSuporte/compactadorDeSuporte")
const { agenteDeFechamentoSondagem } = require("../Services/GerenciadorDeRotinas/GerenciadorDeSondagem/ServicesOpenAiSondagem/openAiServicesFechamentoDeSondagem")
const { openAiServicesBoleto } = require("../Services/GerenciadorDeRotinas/GerenciadordeBoleto/ServicesOpenAiBoleto/openAiServicesBoleto");
const { rotinaDeAbordagem } = require("./GerenciadorDeRotinas/GerenciadorDeAbordagem/rotinaDeAbordagem")
const { rotinaDeFechamento } = require("../Services/GerenciadorDeRotinas/GerenciadorDeFechamento/rotinaDeFechamento")
const { rotinaDeAgendamento } = require("../Services/GerenciadorDeRotinas/GerenciamentoDeAgendamento/rotinaDeAgendamento");
const { rotinaDeBoleto } = require("../Services/GerenciadorDeRotinas/GerenciadordeBoleto/rotinaDeBoleto")
const { rotinaDeSondagemDeAcessorios} = require("./GerenciadorDeRotinas/GerenciadorDeSondagem/rotinaDeSondagemAcessorios");
const { setarReset } = require('./setarReset')
const { sendBotMessage } = require("./messageSender");
const { getUserResponses } = require("./redisService");

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

    let produto, finalidadeUso, investimento;

    switch (novoStage) {
        case "primeiro_atendimento":
            return await rotinaDeAtedimentoInicial(sender, msgContent, pushName);

        case "reinicio_de_atendimento":
            return await rotinaDeReincioAtedimento(sender, msgContent, pushName);

        case "abordagem":
            return await rotinaDeAbordagem({ sender, msgContent, pushName });

        case "sequencia_de_abordagem":
            return await rotinaDeRedirecionamentoDeAbordagem({ sender, msgContent, pushName });

        case "sondagem_de_celular":            
            return await rotinaDeSondagemDeCelular({ sender, msgContent, pushName });

        case "sondagem_de_acessorios":            
            return await rotinaDeSondagemDeAcessorios({ sender, msgContent, pushName });

        case "boleto":             
            return await rotinaDeBoleto({ sender, msgContent, pushName });

        case "boleto_agente":
            return await openAiServicesBoleto({ sender, msgContent, pushName });

        case "boleto_agente_duvidas":
            return await openAiServicesBoleto({ sender, msgContent, pushName });    
                       

        case "agendamento":             
            return await rotinaDeAgendamento({ sender, msgContent, pushName });

        case "agente_de_fechamento_de_sondagem":
            const respostas = await getUserResponses(sender, "sondagem");
            produto = respostas.pergunta_1;
            finalidadeUso = respostas.pergunta_2;
            investimento = respostas.pergunta_3;
            return await agenteDeFechamentoSondagem(sender, msgContent, produto, finalidadeUso, investimento, pushName);

        case "sequencia_de_demonstracao":
            const respostasDemonstracao = await getUserResponses(sender, "sondagem");
            produto = respostasDemonstracao.pergunta_1;
            finalidadeUso = respostasDemonstracao.pergunta_2;
            investimento = respostasDemonstracao.pergunta_3;
            return await rotinaDeDemonstracao({ sender, msgContent, produto, finalidadeUso, investimento, pushName });              

        case "agente_de_demonstração":
            const respostasAgenteDemonstracao = await getUserResponses(sender, "sondagem");
            produto =respostasAgenteDemonstracao.pergunta_1;
            finalidadeUso = respostasAgenteDemonstracao.pergunta_2;
            investimento = respostasAgenteDemonstracao.pergunta_3;
            return await rotinaDeDemonstracao({ sender, msgContent, produto, finalidadeUso, investimento, pushName });

            case "fechamento":
                const respostasAgenteFechamento = await getUserResponses(sender, "fechamento");
                produto =respostasAgenteFechamento.pergunta_1;
                finalidadeUso = respostasAgenteFechamento.pergunta_2;
                investimento = respostasAgenteFechamento.pergunta_3;
                return await rotinaDeFechamento({ sender, msgContent, produto, finalidadeUso, investimento, pushName })

            case "suporte":                    
                return await rotinaDeSuporte({ sender, msgContent, pushName })

            case "compactador_de_suporte":                    
                return await compactadorDeSuporte({ sender, msgContent, pushName })   
        
        default:
            console.log("⚠️ [DEBUG] Nenhum stage válido encontrado.");
            return await sendBotMessage(sender, "Não consegui identificar seu estágio 😕");
    }
};

module.exports = { checagemInicial };
