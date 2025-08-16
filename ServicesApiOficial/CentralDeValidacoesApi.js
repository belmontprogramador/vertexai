const {
    getLastInteractionApiOficial,
    getUserStageApiOficial,
    setLastInteractionApiOficial,
    setUserStageApiOficial,
  } = require("../Services/redisService");
  
  const validarFluxoInicialApi = async (sender, msgContent, pushName) => {
    const cleanedContent = msgContent
      .toLowerCase()
      .replace(/^again\s*/i, "") // remove apenas "again" do início
      .trim();
  
    const lastInteraction = await getLastInteractionApiOficial(sender);
    const currentTime = Date.now();
    const CHECK_TIME_LIMIT = 10 * 60 * 1000;
  
    await setLastInteractionApiOficial(sender, currentTime);
  
    const stageAtual = await getUserStageApiOficial(sender);
    console.log("📥 [API Oficial] cleanedContent:", cleanedContent);
  
    // ✅ Primeira interação
    if (!stageAtual) {
      await setUserStageApiOficial(sender, "primeiro_contato_api_oficial");
      return "primeiro_contato_api_oficial";
    }
  
    // ✅ Opções do primeiro menu
    if (stageAtual === "primeiro_contato_api_oficial") {
      if (cleanedContent === "1") {
        await setUserStageApiOficial(sender, "menu_cliente_existente");
        return "menu_cliente_existente";
      }
  
      if (cleanedContent === "2") {
        await setUserStageApiOficial(sender, "aguardando_novo_cliente");
        return "aguardando_novo_cliente";
      }
  
      // ❌ Opção inválida — define stage de erro
      await setUserStageApiOficial(sender, "opcao_invalida_primeiro_contato");
      return "opcao_invalida_primeiro_contato";
    }

    // ✅ Captura do nome do usuário
    if (stageAtual === "captura_nome_acessorio") {
        return "captura_nome_acessorio";
      }
      
      if (stageAtual === "captura_nome_celular_boleto") {
        return "captura_nome_celular_boleto";
      }

      if (stageAtual === "captura_nome_celular_avista") {
        return "captura_nome_celular_avista";
      }
      
      if (stageAtual === "captura_nome_suporte") {
        return "captura_nome_suporte";
      }
      
  
  
   // ✅ Segmento do cliente existente (A, B ou C)
if (stageAtual === "aguardando_segmento_cliente") {
  if (cleanedContent === "a") {
    await setUserStageApiOficial(sender, "pedir_nome_agente_acessorio");
    return "pedir_nome_agente_acessorio";
  }

  if (cleanedContent === "b") {
    await setUserStageApiOficial(sender, "aguardando_forma_pagamento");
    return "aguardando_forma_pagamento";
  }

  if (cleanedContent === "c") {
    await setUserStageApiOficial(sender, "pedir_nome_agente_suporte");
    return "pedir_nome_agente_suporte";
  }

  // ❌ Opção inválida dentro do menu de cliente existente
  await setUserStageApiOficial(sender, "opcao_invalida_segmento_cliente");
  return "opcao_invalida_segmento_cliente";
}

    
    // ✅ Validação da forma de pagamento
if (stageAtual === "aguardando_forma_pagamento") {
  if (cleanedContent === "x") {
    await setUserStageApiOficial(sender, "pedir_nome_agente_celular_pagamento_a_vista");
    return "pedir_nome_agente_celular_pagamento_a_vista";
  }

  if (cleanedContent === "y") {
    await setUserStageApiOficial(sender, "pedir_nome_agente_celular_pagamento_boleto");
    return "pedir_nome_agente_celular_pagamento_boleto";
  }

  await setUserStageApiOficial(sender, "opcao_invalida_forma_pagamento");
  return "opcao_invalida_forma_pagamento";
}

  
    // 🔁 Fallback genérico
    await setUserStageApiOficial(sender, "opcao_invalida_fallback");
    return "opcao_invalida_fallback";
  };
  
  module.exports = { validarFluxoInicialApi };
  