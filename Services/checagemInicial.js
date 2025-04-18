const { validarFluxoInicial } = require("../Services/ValidacaoDeResposta/CentralDeValidacoes");
const { setarReset } = require('./setarReset')
const { rotinaDeAtedimentoInicial } = require("./GerenciadorDeRotinas/GerenciadorDeAbordagem/rotinaDeAtedimentoInicial");
const { rotinaDeReincioAtedimento } = require("../Services/GerenciadorDeRotinas/GerenciadorDeAbordagem/rotinaDeReinicioAtendimento");
const { rotinaDeSondagemDeCelular } = require("./GerenciadorDeRotinas/GerenciadorDeSondagem/rotinaDeSondagemDeCelular");
const { rotinaDeRedirecionamentoDeAbordagem } = require("../Services/GerenciadorDeRotinas/GerenciadorDeAbordagem/rotinaDeRedirecionamentoDeAbordagem");
const { rotinaDeDemonstracaoPorNome } = require("../Services/GerenciadorDeRotinas/GerenciadorDeDemonstracao/rotinaDeDemonstracaoPorNome"); 
const { compactadorDeSuporte } = require("../Services/GerenciadorDeRotinas/GerenciadorDeSuporte/compactadorDeSuporte")
const { agenteDePagamento } = require("../Services/GerenciadorDeRotinas/GerenciadorDeFechamento/RotinaDePagamento/agenteDePagemento")
const { agenteDeFechamentoSondagem } = require("../Services/GerenciadorDeRotinas/GerenciadorDeSondagem/ServicesOpenAiSondagem/openAiServicesFechamentoDeSondagem")
const { openAiServicesBoleto } = require("../Services/GerenciadorDeRotinas/GerenciadordeBoleto/ServicesOpenAiBoleto/openAiServicesBoleto");
const { agenteDeDemonstracaoDetalhada } = require('../Services/GerenciadorDeRotinas/GerenciadordeDemonstracao/ServicesOpenAiDemonstracao/agenteDeDemonstraçãoDetalhada')
const { agenteDeDecisao } = require("./GerenciadorDeRotinas/GerenciadordeDemonstracao/ServicesOpenAiDemonstracao/agenteDeDecisão")
const { agenteDeDecisaoParaBoletoOuSondagem } = require("./GerenciadorDeRotinas/GerenciadorDeAbordagem/ServicesOpenAiAbordagem/agenteDeDecisaoParaBoletoOuSondagem")
const { agenteDeDecisaoParaDemonstracaoOuBoleto } =  require("./GerenciadorDeRotinas/GerenciadorDeAbordagem/ServicesOpenAiAbordagem/agenteDeDecisaoParaDemonstracaoOuBoleto")
const { rotinaDeDemonstracaoPorValor } = require("./GerenciadorDeRotinas/GerenciadordeDemonstracao/rotinaDeDemonstracaoPorValor")
const { rotinaDeAbordagem } = require("./GerenciadorDeRotinas/GerenciadorDeAbordagem/rotinaDeAbordagem")
const { rotinaDeEntrega } = require("./GerenciadorDeRotinas/GerenciadorDeFechamento/RotinaDeEntrega/rotinaDeEntrega")
const { agentePix } = require("../Services/GerenciadorDeRotinas/GerenciadorDeFechamento/RotinaDePagamento/agentePix")
const { agenteCartao } = require("../Services/GerenciadorDeRotinas/GerenciadorDeFechamento/RotinaDePagamento/agenteCartao")
const { explicacaoBoleto } = require("../Services/GerenciadorDeRotinas/GerenciadorDeFechamento/RotinaDePagamento/explicacaoBoleto")
const { AgenteExplicacaoBoleto } = require("../Services/GerenciadorDeRotinas/GerenciadorDeFechamento/RotinaDePagamento/agenteExplicacaoBoleto")
const { agenteDeEntrega } = require("../Services/GerenciadorDeRotinas/GerenciadorDeFechamento/RotinaDeEntrega/agenteDeEntrega")
const { listarHorariosDisponiveis } = require("../Services/ServicesKommo/gerarDatasProximos15Dias")
const { agendarParaContato } = require("../Services/ServicesKommo/agendarTarefa")
const { agenteDeDemonstracaoPorNome } = require('./GerenciadorDeRotinas/GerenciadordeDemonstracao/ServicesOpenAiDemonstracao/agenteDeDemonstracaoPorNome');
const { rotinaDeFechamento } = require("../Services/GerenciadorDeRotinas/GerenciadorDeFechamento/rotinaDeFechamento")
const { handlerEscolherModelo } = require("./GerenciadorDeRotinas/GerenciadordeDemonstracao/ServicesOpenAiDemonstracao/handlerEscolherModelo")
const { identificarModeloEscolhido } = require("../Services/GerenciadorDeRotinas/GerenciadordeDemonstracao/ServicesOpenAiDemonstracao/identificarModeloEscolhido")
const { rotinaDeAgendamento } = require("../Services/GerenciadorDeRotinas/GerenciamentoDeAgendamento/rotinaDeAgendamento");
const { rotinaDeBoleto } = require("../Services/GerenciadorDeRotinas/GerenciadordeBoleto/rotinaDeBoleto")
const { rotinaDeSondagemDeAcessorios } = require("./GerenciadorDeRotinas/GerenciadorDeSondagem/rotinaDeSondagemAcessorios");

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

        case "sequencia_de_demonstracao_por_nome":           
            return await rotinaDeDemonstracaoPorNome({ sender, msgContent, pushName });
        
        case "identificar_modelo":
            return await identificarModeloEscolhido({ sender, msgContent, pushName });

        case "escolher_modelo":
            return await handlerEscolherModelo({ sender, msgContent, pushName }); 

        case "agente_de_demonstraçao_por_nome":
            return await agenteDeDemonstracaoPorNome({ sender, msgContent, pushName })

        case "agente_de_demonstração":
            const respostasAgenteDemonstracao = await getUserResponses(sender, "sondagem");
            produto = respostasAgenteDemonstracao.pergunta_1;
            finalidadeUso = respostasAgenteDemonstracao.pergunta_2;
            investimento = respostasAgenteDemonstracao.pergunta_3;
            return await agenteDeDemonstracaoPorNome({ sender, msgContent, produto, modeloMencionado, finalidadeUso, investimento, pushName });

        case "agente_de_demonstração_capturar":
            return await identificarModeloEscolhido({ sender, pushName, msgContent });


        case "agente_de_demonstração_detalhada":       
            return await agenteDeDemonstracaoDetalhada({ sender, msgContent, pushName});

        case "agente_de_decisao":       
            return await agenteDeDecisao({ sender, msgContent, pushName}); 
            
        case "agente_de_decisão_de_parcelamento":       
            return await agenteDeDecisaoParaBoletoOuSondagem({ sender, msgContent, pushName});

            case "rotina_demonstração_por_valor":       
            return await rotinaDeDemonstracaoPorValor({ sender, msgContent, pushName});   
            
            case "agente_de_decisao_hall_de_boletos":       
            return await agenteDeDecisaoParaDemonstracaoOuBoleto({ sender, msgContent, pushName});    
            
        case "fechamento":
            return await rotinaDeFechamento({ sender, msgContent, produto, finalidadeUso, investimento, pushName })

        case "agente_de_pagamento":
            return await agenteDePagamento({ sender, msgContent, pushName })

        case "pagamento_pix":
            return await agentePix({ sender, msgContent, pushName });

        case "pagamento_cartao":
            return await agenteCartao({ sender, msgContent, pushName });

        case "pagamento_boleto":
            return await explicacaoBoleto({ sender, msgContent, pushName });

        case "boleto_agente_fluxo":
            return await AgenteExplicacaoBoleto({ sender, msgContent, pushName });

        case "entrega":
            return await rotinaDeEntrega({ sender, msgContent, pushName });

        case "agente_de_entrega":
            return await agenteDeEntrega({ sender, msgContent, pushName });

        case "datas_15_dias":
            return await listarHorariosDisponiveis(sender);

        case "agendamento_de_tarefas":
            return await agendarParaContato({ sender, dataTimestamp, texto })

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
