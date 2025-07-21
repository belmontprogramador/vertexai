const { getTodosUsuariosComStageESemInteracao } = require("../../redisService");
const { pipelineRemarketing } = require("../../ServicesKommo/pipelineRemarketing");
const { normalizePhone } = require("../../normalizePhone");
const { sendBotMessage } = require("../../../Services/messageSender");

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

async function moverContatosParados() {
  const contatos = await getTodosUsuariosComStageESemInteracao();
  const contatosParados = contatos.filter(c => inatividadeEntre1e3Dias(c.ultimaInteracao));


  console.log(`🔍 Encontrados ${contatosParados.length} contatos com inatividade entre 1 e 3 dias.`);

  for (const { sender } of contatosParados) {
    const telefone = normalizePhone(sender);

    try {
      console.log(`➡️ Movendo ${telefone} para remarketing...`);
      await pipelineRemarketing(telefone);
      
      await delay(60000); // Delay de 1 segundo entre cada requisição
    } catch (err) {
      console.error(`❌ Erro ao mover ${telefone}: ${err.message}`);
    }
  }
}

module.exports = { moverContatosParados };
