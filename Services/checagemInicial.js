//Rotinas de Validações
const { validarFluxoInicial } = require("../Services/ValidacaoDeResposta/CentralDeValidacoes");
const { setarReset } = require('./setarReset')
const { sendBotMessage } = require("./messageSender");

//Rotinas de Atendimento 

//Rotina de Atendimento Padrão
const { rotinaDeCapturadeNome  } = require("./GerenciadorDeRotinas/GerenciadorDeAtendimento/rotinaDeCapturadeNome")
const { agenteDeIdentificacaoDeNome } = require("./GerenciadorDeRotinas/GerenciadorDeAtendimento/agenteDeIdentificacaoDeNome");
const { rotinaDePrimeiroAtendimento } = require("./GerenciadorDeRotinas/GerenciadorDeAtendimento/rotinaDePrimeiroAtendimento");
const { openAiServicesAtendimento } = require("./GerenciadorDeRotinas/GerenciadorDeAtendimento/openAiServicesAtendimento");
const { rotinaDeReincioAtendimento } = require("./GerenciadorDeRotinas/GerenciadorDeAtendimento/rotinaDeReincioDeAtendimento");

//Rotina de atendimento para boleto
const { rotinaDeCapturadeNomeParaBoleto } = require("./GerenciadorDeRotinas/GerenciadorDeAtendimento/rotinaDeCapturadeNomeParaBoleto");
const { agenteDeIdentificacaoDeNomeParaBoleto } = require("./GerenciadorDeRotinas/GerenciadorDeAtendimento/agenteDeIdentificacaoDeNomeParaBoleto");

//Rotina de atendimento para Trafego
const { rotinaDeCapturadeNomeParaTrafego } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/PorTrafego/rotinaDeCapturadeNomeParaTrafego");
const { agenteDeIdentificacaoDeNomeParaTrafego } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/PorTrafego/agenteDeIdentificacaoDeNomeParaTrafego");

//Rotinas de Demonstração

//Rotina de Demonstração por valor
const { rotinaDeDemonstracaoDeCelularPorValor } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/PorValor/rotinaDeDemonstracaoDeCelularPorValor");
const { filtroDeValor } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/PorValor/filtroDeValor");
const { agenteDeDemonstracaoPorValor } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/PorValor/agenteDeDemonstracaoPorValor");
const { identificarModeloPorValor } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/PorValor/identificarModeloPorValor");
const { identificarModeloPorNomePosDemonstraçãoPorValor } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/PorValor/identificarModeloPorNomePosDemonstraçãoPorBoleto");


//Rotina de Demonstração por Nome
const { rotinaDeDemonstracaoDeCelularPorNome } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/PorNome/rotinaDeDemonstraçãoDeCelularPorNome");
const { identificarModeloPorNome } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/PorNome/identificarModeloPorNome");
const { identificarModeloPorNomePosDemonstração } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/PorNome/identificarModeloPorNomePosDemonstração");
const { agenteDeDemonstracaoPorNome } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/PorNome/agenteDeDemonstracaoPorNome");
const { agenteDeDecisaoPosDemonstracao } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/PorNome/agenteDeDecisaoPosDemonstracao");

 //Rotina de Demonstração Detalhada
const { agenteDeDemonstracaoDetalhada } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/agenteDeDemonstracaoDetalhada");


//Rotina de Demonstração Boleto
const { openaAiServicesBoletoDesicao1 } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/PorBoleto/openaAiServicesBoletoDesicao1");
const { rotinaDeBoleto } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/PorBoleto/rotinaDeBoleto");
const { openAiServicesBoletoDecisao2 } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/PorBoleto/openAiServicesBoletoDecisao2");
const { openAiServicesDuvidasBoleto } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/PorBoleto/openAiServicesDuvidasBoleto");
const { agenteDeDemonstracaoPorBoleto } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/PorBoleto/agenteDeDemonstracaoPorBoleto");
const { agenteDeDemonstracaoPorNomePorBoleto } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/PorBoleto/agenteDeDemonstracaoPorNomePorBoleto");
const { agenteDeDemonstracaoPosDecisaoPorBoleto } = require("./GerenciadorDeRotinas/GerenciadorDeDemonstracao/PorBoleto/agenteDeDemonstracaoPosDecisaoPorBoleto")
//Rotina de Agendamento
const { rotinaDeAgendamento } = require("./GerenciadorDeRotinas/GerenciadorDeAgendamento/rotinaDeAgendamento");





 


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

        //Rotinas de Atendimento

        //Rotina de Atendimento Padrão
        case "rotina_captura_de_nome":
            return await rotinaDeCapturadeNome({ sender, msgContent, pushName });
        case "agente_de_identificação_de_nome":
            return await agenteDeIdentificacaoDeNome({ sender, msgContent, pushName });            
        case "rotina_de_primeiro_atendimento":
            return await rotinaDePrimeiroAtendimento({ sender, msgContent, pushName });           
        case "opean_Ai_Services_Atendimento":
            return await openAiServicesAtendimento({ sender, msgContent, pushName });
        case "reinicio_de_atendimento":
            return await rotinaDeReincioAtendimento({sender, msgContent, pushName});

        //Rotina de atendimento para boleto
        case "rotina_captura_de_nome_para_boleto":
            return await rotinaDeCapturadeNomeParaBoleto({ sender, msgContent, pushName });
        case "agente_de_identificação_de_nome_para_boleto":
            return await agenteDeIdentificacaoDeNomeParaBoleto({ sender, msgContent, pushName });

        //Rotina de atendimento para Trafego
        case "rotina_captura_de_nome_para_trafego":
            return await rotinaDeCapturadeNomeParaTrafego({ sender, msgContent, pushName });
        case "agente_de_identificação_de_nome_para_trafego":
            return await agenteDeIdentificacaoDeNomeParaTrafego({sender, msgContent, pushName});
            
            
            //Rotinas de Demonstração

        //Rotina de Demonstração por valor      
        case "rotina_de_demonstracao_de_celular_por_valor":
            return await rotinaDeDemonstracaoDeCelularPorValor({sender, msgContent, pushName});
        case "filtro_de_valor":
            return await filtroDeValor({sender, msgContent, pushName});            
        case "agente_de_demonstraçao_por_valor":
            return await agenteDeDemonstracaoPorValor({sender, msgContent, pushName});             
        case "identificar_modelo_por_valor":
            return await identificarModeloPorValor({sender, msgContent, pushName});
        case "identificar_modelo_por_nome_pos_demonstração_por_valor":
            return await identificarModeloPorNomePosDemonstraçãoPorValor({sender, msgContent, pushName});
            
            
        //Rotina de Demonstração Por Nome
        case "rotina_de_demonstracao_de_celular_por_nome":
            return await rotinaDeDemonstracaoDeCelularPorNome({ sender, msgContent, pushName  });
        case "identificar_modelo_por_nome":
            return await identificarModeloPorNome({ sender, msgContent, pushName });  
        case "identificar_modelo_por_nome_pos_demonstração":
            return await identificarModeloPorNomePosDemonstração({ sender, msgContent, pushName });         
        case "agente_de_demonstração_por_nome":
            return await agenteDeDemonstracaoPorNome({ sender, msgContent, pushName });
        case "aguardando_decisao_pos_demonstração":
            return await agenteDeDecisaoPosDemonstracao({ sender, msgContent, pushName });


        //Rotina de Demonstração Detalhada
        case "agente_de_demonstração_detalhada" :
            return await agenteDeDemonstracaoDetalhada({ sender, msgContent, pushName });

        
            
        //Rotina de Demonstração Boleto
        case "opena_ai_services_boleto_decisao_1" :
            return await  openaAiServicesBoletoDesicao1({ sender, msgContent, pushName, modeloMencionado: "" });
        case "rotina_de_boleto" :
            return await  rotinaDeBoleto({ sender, msgContent, pushName, modeloMencionado: "" });
        case "open_ai_services_boleto_decisao_2" :
            return await  openAiServicesBoletoDecisao2({ sender, msgContent, pushName, modeloMencionado: "" });    
        case "open_ai_services_duvidas_boleto" :
            return await  openAiServicesDuvidasBoleto({ sender, msgContent, pushName, modeloMencionado: "" }); 
        case "agente_de_demonstração_por_boleto" :
            return await  agenteDeDemonstracaoPorBoleto({ sender, msgContent, pushName, modeloMencionado: "" }); 
        case "agente_de_demonstracao_por_nome_por_boleto" :
            return await  agenteDeDemonstracaoPorNomePorBoleto({ sender, msgContent, pushName, modeloMencionado: "" });
        case "agente_de_demonstracao_pos_decisao_por_boleto" :
            return await  agenteDeDemonstracaoPosDecisaoPorBoleto({ sender, msgContent, pushName, modeloMencionado: "" });
            agenteDeDemonstracaoPosDecisaoPorBoleto
 
        //Rotina de Agendamento
        case "rotina_de_agendamento" :
            return await rotinaDeAgendamento({sender, msgContent, pushName});
        

        default:
            console.log("⚠️ [DEBUG] Nenhum stage válido encontrado.");
            return await sendBotMessage(sender, "Não consegui identificar seu estágio 😕");
    }
};

module.exports = { checagemInicial };
