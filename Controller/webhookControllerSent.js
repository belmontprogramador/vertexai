const {
  pausarBotGlobalmente,
  retomarBotGlobalmente,
  pausarBotParaUsuario,
  retomarBotParaUsuario,
  appendToConversation,
  getNomeUsuario
} = require("../Services/redisService");

const { pipelineAtendimentoHumanoComando } = require("../Services/ServicesKommo/pipelineAtendimentoHumanoComando");
const { pipelineReaquecimentoLead } = require("../Services/ServicesKommo/pipelineReaquecimentoLead");
const { pipelineTarefaAgendada } = require("../Services/ServicesKommo/pipelineTarefaAgendada");
const { pipelineAtendimentoHumanoBoleto } = require("../Services/ServicesKommo/pipelineAtendimentoHumanoBoleto");





// 📤 Controller para mensagens enviadas
const webhookControllerSent = async (req, res) => {
  try {
    const { messageId, chat, msgContent, fromMe, sender } = req.body;

    if (!fromMe || !msgContent || !messageId || !chat?.id || !sender?.id) {
      return res.status(400).json({ error: "Nenhuma mensagem válida recebida" });
    }

    const senderId = sender.id;
    const verifiedBizName = sender.verifiedBizName || "Não verificado";
    const normalizarSenderId = (id) => id?.split("@")[0];
const recipientId = normalizarSenderId(chat.id);


    const content =
      msgContent?.extendedTextMessage?.text ||
      msgContent?.conversation ||
      null;

    if (!content) {
      return res.status(200).json({ message: "Mensagem sem texto ignorada." });
    }

    const comando = content
    .toLowerCase()
    .normalize("NFD") // remove acentos
    .replace(/[\u0300-\u036f]/g, "") // remove marcas de acento
    .replace(/[^\x00-\x7F]/g, "") // remove emojis e caracteres não ASCII
    .replace(/[^a-z0-9\s]/gi, "") // remove pontuação restante
    .trim();
  
    console.log("🔍 Comando normalizado:", comando);


    // ⚙️ Pausar e retomar o bot com base na mensagem enviada
    if (comando === "vou chamar outro atendente") {
      await pausarBotGlobalmente();
      console.log("🛑 Bot pausado via mensagem enviada.");
    }

    if (comando === "retomarbot") {
      await retomarBotGlobalmente();
      console.log("✅ Bot retomado via mensagem enviada.");
    }

    const pushName = sender?.pushName || "Contato Vertex"; // ✅ Adicione esta linha onde define senderId

    const comandosPausar = [
      "um minuto",
      "pausar atendimento",
      "espera um pouco",
      "oi amadinha aqui",
      "oi felipe aqui",
      "oi vitor aqui",
      "ficou parada e queria saber se ainda posso te ajudar"
    ];
    
    if (comandosPausar.includes(comando)) {
      await pausarBotParaUsuario(recipientId);
      console.log(`⏸️ Bot pausado individualmente para ${recipientId}`);
    
      try {
        await pipelineAtendimentoHumanoComando({
          name: pushName,
          phone: recipientId
        });
      } catch (error) {
        console.error(`❌ Erro ao mover para atendimento humano:`, error.message);
      }
    } 

     
    const comandosAtendimentoHumanoBoleto = [
      "oi amadinha aqui vamos falar sobre boleto",
      "oi felipe aqui vamos falar sobre boleto",
      "oi vitor aqui vamos falar sobre boleto"
    ];
    
    if (comandosAtendimentoHumanoBoleto.includes(comando)) {
      console.log(`📨 Comando de atendimento humano boleto detectado para ${recipientId}`);
    
      // ⏸️ 1. Pausar bot individualmente
      try {
        await pausarBotParaUsuario(recipientId);
        console.log(`⏸️ Bot pausado individualmente para ${recipientId}`);
      } catch (err) {
        console.warn(`⚠️ Erro ao pausar bot para ${recipientId}:`, err.message);
      }
    
      // 🔁 2. Mover lead para "Atendimento Humano Boleto" (somente string!)
      try {
        await pipelineAtendimentoHumanoBoleto(recipientId); // ✅ aqui corrigido
        console.log("✅ Lead movido para Atendimento Humano Boleto com sucesso.");
      } catch (err) {
        console.error("❌ Erro ao mover para Atendimento Humano Boleto:", err.message);
      }
    }
    
    
    
    
    
    
    if (comando === "retomar usuario") {
      await retomarBotParaUsuario(recipientId);
      console.log(`✅ Bot retomado individualmente para ${recipientId}`);
    }

    if (comando === "ahhh entendi"
    ) {
      console.log(`♻️ Comando de reaquecimento detectado para ${recipientId}`);
      try {
        await pipelineReaquecimentoLead({
          name: pushName,
          phone: recipientId
        });
      } catch (err) {
        console.error("❌ Erro ao mover para REAQUECIMENTO:", err.message);
      }
    }
    
    if (comando.includes("agendado para retomar contato")) {
      console.log(`♻️ Comando de reaquecimento detectado para ${recipientId}`);
      try {
        await pipelineTarefaAgendada({
          name: pushName,
          phone: recipientId
        });
      } catch (err) {
        console.error("❌ Erro ao mover para REAQUECIMENTO:", err.message);
      }
    }
    
    
    

    console.log(`
📤 [DEBUG] Mensagem enviada:
- ID: ${messageId}
- Remetente: ${senderId} (Negócio: ${verifiedBizName})
- Destinatário: ${recipientId}
- Conteúdo: ${content}
------------------------------------------------`);


// await appendToConversation(recipientId, {
//   tipo: fromMe ? "mensagem_bot" : "mensagem_humana",
//   conteudo: content,
//   timestamp: new Date().toISOString()
// });

// console.log(`💾 Mensagem gravada no histórico de ${recipientId}:`, {
//   tipo: fromMe ? "mensagem_bot" : "mensagem_humana",
//   conteudo: content
// });

    return res.json({ message: "Mensagem enviada processada com sucesso!" });
  } catch (error) {
    console.error("❌ Erro ao processar webhook de mensagens enviadas:", error);
    res.status(500).json({ error: "Erro ao processar a mensagem enviada" });
  }
};


module.exports = { webhookControllerSent };
