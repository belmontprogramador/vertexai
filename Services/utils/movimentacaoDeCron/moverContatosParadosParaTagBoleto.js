const { getTodosUsuariosComStageESemInteracao } = require("../../redisService");
 
const { normalizePhone } = require("../../normalizePhone");
const { pipelineRemarketingTagBoleto } = require("../../ServicesKommo/pipelineRemarketingTagBoleto");

function passouMaisDe3Dias(timestamp) {
  if (!timestamp) return true;
  const TRES_DIAS_MS = 1000 * 60 * 60 * 24 * 3;
  return Date.now() - Number(timestamp) > TRES_DIAS_MS;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function moverContatosParadosParaTagBoleto() {
  const contatos = await getTodosUsuariosComStageESemInteracao();
  const contatosParados = contatos.filter(c => passouMaisDe3Dias(c.ultimaInteracao));

  console.log(`🔍 Encontrados ${contatosParados.length} contatos parados há mais de 3 dias.`);

  for (const { sender } of contatosParados) {
    const telefone = normalizePhone(sender);

    try {
      console.log(`➡️ Movendo ${telefone} para 'REMARKETING TAG'...`);
      await pipelineRemarketingTagBoleto(telefone);
    } catch (err) {
      console.error(`❌ Erro ao mover ${telefone}: ${err.message}`);
    }

    // Aguarda 500ms antes de continuar com o próximo
    await delay(60000);
  }
}

module.exports = { moverContatosParadosParaTagBoleto };
