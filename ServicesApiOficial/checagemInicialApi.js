const { validarFluxoInicialApi } = require("./CentralDeValidacoesApi");
const { sendBotMessage } = require("../Services/messageSender");

const { primeiroContato } = require("./GerenciadorDeRotina/primeiroContato");
const { menuClienteExistente } = require("./GerenciadorDeRotina/menuClienteExistente");
const { aguardandoNovoCliente } = require("./GerenciadorDeRotina/aguardandoNovoCliente");
const { menuAcessorio,
  menuCelularBoleto,
  menuSuporte,
  menuCelularAvista, } = require("./GerenciadorDeRotina/menuCelular.js");
const { setarResetApiOficial } = require("./setarResetApiOficial");

// Handlers de opções inválidas
const { opcaoInvalidaPrimeiroContato } = require("./GerenciadorDeRotina/opcaoInvalidaPrimeiroContato.js");
const { opcaoInvalidaSegmento } = require("./GerenciadorDeRotina/opcaoInvalidaSegmento");
const { opcaoInvalidaFallbackCliente } = require("./GerenciadorDeRotina/opcaoInvalidaFallbackClientes.js");
const { opcaoInvalidaFallbackNaoCliente } = require("./GerenciadorDeRotina/opcaoInvalidaFallbackNaoCliente");
const { getUserStageApiOficial } = require("../Services/redisService.js");
const { pedirNomeAgenteAcesorios } = require("./GerenciadorDeRotina/pedirNomeAgenteAcesorios.js");
const { capturaNomeAgenteAcessorio } = require("./GerenciadorDeRotina/capturaNomeAgente.js");
const { pedirNomeAgenteCelularBoleto } = require("./GerenciadorDeRotina/pedirNomeAgenteCelularBoleto.js");
const { pedirNomeAgenteSuporte } = require("./GerenciadorDeRotina/pedirNomeAgenteSuporte.js");
const { capturaNomeAgenteCelularBoleto } = require("./GerenciadorDeRotina/capturaNomeAgenteCelularBoleto.js");
const { capturaNomeAgenteSuporte } = require("./GerenciadorDeRotina/capturaNomeAgenteSuporte.js");
const { menuFormaPagamento } = require("./GerenciadorDeRotina/menuFormaPagamento.js");
const { pedirNomeAgenteCelularAvista } = require("./GerenciadorDeRotina/pedirNomeAgenteCelularAvista.js");
const { capturaNomeAgenteCelularAvista } = require("./GerenciadorDeRotina/capturaNomeAgenteCelularAvista.js");
const axios = require("axios");
const { opcaoInvalidaSegmentoCliente } = require("./GerenciadorDeRotina/opcaoInvalidaSegmentoCliente.js");
const { opcaoInvalidaFormaPagamento } = require("./GerenciadorDeRotina/opcaoInvalidaFormaPagamento.js");

async function enviarMensagemWhatsApp(sender, body) {
  const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: sender,
    type: "text",
    text: { body },
  };

  const headers = {
    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    "Content-Type": "application/json",
  };

  return axios.post(url, payload, { headers });
}



const checagemInicialApi = async (sender, msgContent, pushName, messageId, quotedMessage) => {
  const cleanedContent = msgContent;

  const stageAtual = await getUserStageApiOficial(sender);

  let novoStage;

  if (cleanedContent === "again resetardados") {
    await setarResetApiOficial(sender, msgContent);
    novoStage = "primeiro_atendimento";
    console.log(`🎯 [DEBUG] Executando switch para stage: ${novoStage}`);
    return;
  } else {
    novoStage = await validarFluxoInicialApi(sender, msgContent, pushName);

    if (novoStage === "ignorar") {
      console.log("🛡️ [DEBUG] Mensagem descartada silenciosamente por bloqueio temporário.");
      return;
    }

    console.log(`🎯 [DEBUG] Executando switch para stage: ${novoStage}`);
  }

  // 🔁 Roteamento
  switch (novoStage) {
    case "primeiro_contato_api_oficial":
      return await primeiroContato({ sender, msgContent, pushName });

    case "menu_cliente_existente":
      return await menuClienteExistente(sender);

    case "aguardando_novo_cliente":
      return await aguardandoNovoCliente(sender);

    case "pedir_nome_agente_acessorio":
      return await pedirNomeAgenteAcesorios(sender);

    case "pedir_nome_agente_celular_pagamento_boleto":
      return await pedirNomeAgenteCelularBoleto(sender);

      case "pedir_nome_agente_celular_pagamento_a_vista":
  return await pedirNomeAgenteCelularAvista(sender);

    case "pedir_nome_agente_suporte":
      return await pedirNomeAgenteSuporte(sender);

    case "captura_nome_acessorio":
      return await capturaNomeAgenteAcessorio(sender, msgContent);

    case "captura_nome_celular_boleto":
      return await capturaNomeAgenteCelularBoleto(sender, msgContent);

      case "captura_nome_celular_avista":
  return await capturaNomeAgenteCelularAvista(sender, msgContent);


    case "captura_nome_suporte":
      return await capturaNomeAgenteSuporte(sender, msgContent);

    case "aguardando_forma_pagamento":
      return await menuFormaPagamento(sender, msgContent);


    case "menu_acessorio":
      return await menuAcessorio(sender);

    case "menu_celular":
      return await menuCelularBoleto(sender);

    case "menu_suporte":
      return await menuSuporte(sender);

    // ❌ Opções inválidas
    case "opcao_invalida_primeiro_contato":
      return await opcaoInvalidaPrimeiroContato(sender, msgContent, pushName, messageId, quotedMessage);

    case "opcao_invalida_segmento":
      return await opcaoInvalidaSegmento(sender, msgContent, pushName, messageId, quotedMessage);

    case "opcao_invalida_fallback":
      if (stageAtual === "menu_cliente_existente") {
        return await opcaoInvalidaFallbackCliente(sender, msgContent, pushName, messageId, quotedMessage);
      } else {
        return await opcaoInvalidaFallbackNaoCliente(sender, msgContent, pushName, messageId, quotedMessage);
      }

      case "opcao_invalida_segmento_cliente":
        return await opcaoInvalidaSegmentoCliente(sender, msgContent, pushName, messageId, quotedMessage);
  
        case "opcao_invalida_forma_pagamento":
        return await opcaoInvalidaFormaPagamento(sender, msgContent, pushName, messageId, quotedMessage);
        

      default:
  console.log("⚠️ [DEBUG] Nenhum stage válido encontrado.");
  return await enviarMensagemWhatsApp(
    sender,
    "⚠️ Você está falando com uma mensagem automática.\n\nPor favor, colabore com as últimas instruções enviadas acima para que possamos te ajudar da melhor forma possível. 😊"
  );

      
  }
};

module.exports = { checagemInicialApi };
