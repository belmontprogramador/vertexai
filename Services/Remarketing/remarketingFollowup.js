const path = require("path");
const fs = require("fs");

const {
  getTodosUsuariosComStageESemInteracao,
  getConversation,
  getNomeUsuario,
  appendToConversation,
  getRemarketingStatus,
  marcarRemarketingComoEnviado
} = require("../redisService");
const { pipelineRemarketingInativo } = require("../ServicesKommo/pipelineRemarketingInativo");

const { sendBotMessage } = require("../messageSender");

// 🕒 Converte milissegundos para minutos inteiros
const minutosDeInatividade = (ms) => Math.floor(ms / (60 * 1000));

// 🧼 Normaliza nome do stage
const normalizarStage = (stage) =>
  stage
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9_]/g, "_");    // substitui símbolos por "_"

// 📁 Carrega o JSON do template do stage
const carregarTemplatePorStage = (stage) => {
  try {
    const nomeArquivo = `${normalizarStage(stage)}.json`;
    const caminho = path.join(__dirname, "remarketingTemplates", nomeArquivo);

    console.log(`📄 Buscando template para stage: "${stage}"`);
    console.log(`📦 Caminho final do arquivo: ${caminho}`);

    const raw = fs.readFileSync(caminho, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`⚠️ Template não encontrado ou inválido para stage: ${stage}`);
    return null;
  }
};

// 🧠 Escolhe a mensagem com base no tempo
const getMensagemPorTempo = (template, minutos, nome) => {
  const chaves = Object.keys(template)
    .map(k => parseInt(k))
    .filter(k => !isNaN(k))
    .sort((a, b) => b - a); // ordem decrescente

  for (const tempo of chaves) {
    if (minutos >= tempo) {
      let mensagem = template[tempo];
      return mensagem.includes("{{nome}}")
        ? mensagem.replace(/{{nome}}/g, nome || "")
        : mensagem;
    }
  }

  return null;
};

// 🚀 Loop principal de remarketing
const remarketingFollowup = async () => {
  const usuarios = await getTodosUsuariosComStageESemInteracao();
  const agora = Date.now();

  console.log(`🔁 Iniciando rotina de remarketing para ${usuarios.length} usuários...\n`);

  for (const usuario of usuarios) {
    const { sender, stage, ultimaInteracao } = usuario;

    console.log(`🔍 Usuário: ${sender}`);
    console.log(`🎯 Stage atual: "${stage}"`);

    const tempoParadoMs = agora - parseInt(ultimaInteracao, 10);
    const minutos = minutosDeInatividade(tempoParadoMs);
    console.log(`⏱️ Tempo parado: ${minutos} minutos`);

    const nome = await getNomeUsuario(sender);

    const template = carregarTemplatePorStage(stage);
    if (!template) {
      console.log(`❌ Template ausente. Pulando usuário.\n`);
      continue;
    }

    const status = await getRemarketingStatus(sender);

    const chaves = Object.keys(template)
      .map(k => parseInt(k))
      .filter(k => !isNaN(k))
      .sort((a, b) => a - b); // ordem crescente
    
    for (const tempo of chaves) {
      if (minutos >= tempo && !(status?.[stage]?.[tempo])) {
        let mensagem = template[tempo];
        if (mensagem.includes("{{nome}}")) {
          mensagem = mensagem.replace(/{{nome}}/g, nome || "");
        }
    
        console.log(`✅ Enviando mensagem para tempo ${tempo}min:\n"${mensagem}"\n`);
    
        await sendBotMessage(sender, mensagem);
    
        await appendToConversation(sender, {
          tipo: "mensagem_automatica",
          conteudo: `remarketing_${tempo}: ${mensagem}`,
          timestamp: new Date().toISOString()
        });
    
        await marcarRemarketingComoEnviado(sender, stage, tempo);
        break; // envia só um por vez
      }
    }
    
  }

  console.log(`✅ Remarketing finalizado.\n`);
};

module.exports = { remarketingFollowup };
