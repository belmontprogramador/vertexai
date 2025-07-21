const path = require("path");
const fs = require("fs");

const {
  getTodosUsuariosComStageESemInteracao,
  getNomeUsuario,
  appendToConversation,
  getRemarketingStatus,
  marcarRemarketingComoEnviado,
  getUsuariosComBotPausado,
  isBotPausado
} = require("../redisService");

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
    const raw = fs.readFileSync(caminho, "utf8");
    return JSON.parse(raw);
  } catch (e) {
     
    return null;
  }
};

// 🚀 Loop principal de remarketing
const remarketingFollowup = async () => {
  console.log("🔁 Rodando cron de remarketing...");

  const usuarios = await getTodosUsuariosComStageESemInteracao();
  const agora = Date.now();

  if (!usuarios || usuarios.length === 0) return;

  const usuariosPausados = new Set((await getUsuariosComBotPausado()).map(n => n.replace(/\D/g, '')));
  const pausadoGlobalmente = await isBotPausado();
  if (pausadoGlobalmente) return;

  let totalEnviadas = 0;

  for (const usuario of usuarios) {
    const { sender, stage, ultimaInteracao } = usuario;
    if (!sender || !stage) continue;

    const senderNormalizado = sender.replace(/\D/g, '');
    if (usuariosPausados.has(senderNormalizado)) continue;
    if (!ultimaInteracao || isNaN(ultimaInteracao)) continue;

    const tempoParadoMs = agora - parseInt(ultimaInteracao, 10);
    const minutos = minutosDeInatividade(tempoParadoMs);
    if (minutos < 0) {
      console.warn(`⛔ Tempo negativo para ${sender} — valor: ${minutos}min`);
      continue;
    }

    const nome = await getNomeUsuario(sender);
    const template = carregarTemplatePorStage(stage);
    if (!template) continue;

    const status = await getRemarketingStatus(sender);
    const stageNormalizado = normalizarStage(stage);
// ⚠️ Se já recebeu qualquer mensagem nesse estágio, não envia mais nada

// ✅ Agora está no lugar certo
if (status?.[stageNormalizado] && Object.keys(status[stageNormalizado]).length > 0) {
 
  continue;
}

    const chaves = Object.keys(template)
      .map(k => parseInt(k))
      .filter(k => !isNaN(k))
      .sort((a, b) => a - b);

const LIMITE_MAXIMO_MINUTOS = 4320;

    const tempoMaximoTemplate = Math.max(...chaves);
    if (minutos > LIMITE_MAXIMO_MINUTOS) {
      // Proteção: só envia se estiver dentro do intervalo planejado
      continue;
    }

    let enviado = false;

    for (const tempo of chaves) {
      const tempoStr = tempo.toString();
      const jaEnviado = status?.[stageNormalizado]?.[tempoStr];

      if (minutos >= tempo && !jaEnviado) {
        let mensagem = template[tempoStr] || template[tempo]; // aceita string ou int

        if (mensagem.includes("{{nome}}")) {
          mensagem = mensagem.replace(/{{nome}}/g, nome || "");
        }

        try {
          await sendBotMessage(sender, mensagem);

          await appendToConversation(sender, {
            tipo: "mensagem_automatica",
            conteudo: `remarketing_${tempo}: ${mensagem}`,
            timestamp: new Date().toISOString()
          });

          if (!status[stageNormalizado]) status[stageNormalizado] = {};
          status[stageNormalizado][tempoStr] = true;
          await marcarRemarketingComoEnviado(sender, stageNormalizado, tempoStr);

          enviado = true;
          totalEnviadas++;
        } catch (err) {
          console.error(`❌ Erro ao enviar mensagem para ${sender}:`, err.message);
        }

        break; // não envia múltiplas para o mesmo usuário no mesmo ciclo
      }
    }
  }

  console.log(`📊 Total de mensagens enviadas no remarketing: ${totalEnviadas}`);
  console.log(`✅ Remarketing finalizado.\n`);
};

module.exports = { remarketingFollowup };
