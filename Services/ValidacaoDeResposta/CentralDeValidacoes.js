// 📁 Services/ValidacaoDeResposta/CentralDeValidacoes.js
const { getLastInteraction, setUserStage } = require("../../Services/redisService");

const CHECK_TIME_LIMIT = 1 * 60 * 1000;

// 🔄 Verifica se a sessão expirou e seta stage para reinício
const verificarExpiracao = async (sender, now) => {
    const lastInteraction = await getLastInteraction(sender);
    if (!lastInteraction || now - lastInteraction > CHECK_TIME_LIMIT) {
      
      console.log(`⏳ [DEBUG] Tempo expirado. Stage setado: reinicio_de_atendimento`);
      return await setUserStage(sender, "reinicio_de_atendimento");
    }
    return null;
  };
  

// 🔍 Valida a resposta do usuário se estiver dentro do tempo
const validarRespostaUsuario = async (sender, content, now) => {
    console.log(`📩 [VALIDAÇÃO] Entrando na função validarRespostaUsuario com content: "${content}"`);
  
    const lastInteraction = await getLastInteraction(sender);
  
    if (lastInteraction && (now - lastInteraction <= CHECK_TIME_LIMIT)) {
      if (content === "sim") {        
        console.log("✅ [VALIDAÇÃO] Stage setado para sondagem");
        return await setUserStage(sender, "sondagem");
      } else if (content === "não" || content === "nao") {        
        console.log("✅ [VALIDAÇÃO] Stage setado para continuar_de_onde_parou");
        return await setUserStage(sender, "continuar_de_onde_parou");
      }
    } else {
      await setUserStage(sender, "reinicio_de_atendimento");
      console.log("⏳ [VALIDAÇÃO] Tempo expirado. Stage setado para reinicio_de_atendimento");
      return "reinicio_de_atendimento";
    }
  
    return null;
  };
  

module.exports = { verificarExpiracao, validarRespostaUsuario };