const { getTodosUsuariosComStageESemInteracao } = require("../../redisService");
const { normalizePhone } = require("../../normalizePhone");
const { sendBotMessage } = require("../../../Services/messageSender");
const { pipelineRemarketingBoleto } = require("../../ServicesKommo/pipelineRemarketingBoleto");

function inatividadeEntre1e3Dias(timestamp) {
  if (!timestamp) return false;

  const agora = Date.now();
  const diff = agora - Number(timestamp);

  const UM_DIA_MS = 1000 * 60 * 60 * 24;
  const TRES_DIAS_MS = UM_DIA_MS * 3;

  return diff >= UM_DIA_MS && diff <= TRES_DIAS_MS;
}

// Utilitário de delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function moverContatosParadosBoleto() {
  const contatos = await getTodosUsuariosComStageESemInteracao();
  const contatosParados = contatos.filter(c => inatividadeEntre1e3Dias(c.ultimaInteracao));

  console.log(`🔍 Encontrados ${contatosParados.length} contatos com inatividade entre 1 e 3 dias.`);

  for (const { sender } of contatosParados) {
    const telefone = normalizePhone(sender);

    try {
      console.log(`➡️ Movendo ${telefone} para remarketing...`);
      await pipelineRemarketingBoleto(telefone);

      // ✅ Se quiser ativar envio de mensagem, descomente a linha abaixo:
      // await sendBotMessage(telefone, `oi tudo bem por ai?\nnotei que nossa conversa ficou parada e queria saber se ainda posso te ajudar 😉`);
    } catch (err) {
      console.error(`❌ Erro ao mover ${telefone}: ${err.message}`);
    }

    console.log(`⏳ Aguardando 60 segundos antes de processar o próximo...`);
    await delay(60000); // Delay de 60 segundos garantido entre as execuções
  }
}

module.exports = { moverContatosParadosBoleto };
