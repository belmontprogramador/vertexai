#!/usr/bin/env node
// moverContatosParadosParaRemarketing.cli.js
// ▶️ Executa como script: `node scripts/moverContatosParadosParaRemarketing.cli.js`

// ------- .env robusto (tenta vários caminhos) -------
const fsSync = require("fs");
const path = require("path");
const dotenv = require("dotenv");
(function loadEnv() {
  // 1) .env do cwd
  dotenv.config();
  // 2) fallbacks subindo pastas, se faltar token
  if (!process.env.KOMMO_TOKEN) {
    const guesses = [
      path.resolve(__dirname, ".env"),
      path.resolve(__dirname, "..", ".env"),
      path.resolve(__dirname, "..", "..", ".env"),
      path.resolve(__dirname, "..", "..", "..", ".env"),
      path.resolve(process.cwd(), ".env"),
    ];
    for (const p of guesses) {
      if (fsSync.existsSync(p)) {
        dotenv.config({ path: p, override: false });
        if (process.env.KOMMO_TOKEN) break;
      }
    }
  }
})();

// ------- deps -------
const fs = require("fs/promises");
const axios = require("axios");

// 👉 AJUSTE estes imports conforme sua estrutura de pastas:
let getTodosUsuariosComStageESemInteracao, isBotPausado, isBotPausadoParaUsuario;
let normalizePhone;
try {
  // exemplo: se este script estiver em `scripts/`, e seu redisService estiver em `Services/redisService.js`
  ({
    getTodosUsuariosComStageESemInteracao,
    isBotPausado,
    isBotPausadoParaUsuario,
  } = require("../Services/redisService"));
  ({ normalizePhone } = require("../Services/normalizePhone"));
} catch {
  try {
    // alternativa (se o script estiver dentro de `Services/utils/movimentacaoDeCron/`)
    ({
      getTodosUsuariosComStageESemInteracao,
      isBotPausado,
      isBotPausadoParaUsuario,
    } = require("../../redisService"));
    ({ normalizePhone } = require("../../normalizePhone"));
  } catch (e2) {
    console.error("❌ Ajuste os paths dos imports de redisService/normalizePhone neste script.", e2.message);
    process.exit(1);
  }
}

// ------- constantes -------
const KOMMO_BASE_URL = process.env.KOMMO_BASE_URL || "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;
if (!KOMMO_TOKEN) {
  console.error("❌ KOMMO_TOKEN ausente. Certifique-se de que o .env foi carregado.");
  process.exit(1);
}

const PIPELINE_ID = 7471539;      // 👈 atuar somente neste pipeline
const TARGET_STAGE_ID = 88879064; // REMARKETING ai 1 dia
const TAG_BOLETO = "boletopipeline";

// Estágios bloqueados dentro do pipeline 7471539
const BLOCKED_STATUS_IDS = [
  88879064, // REMARKETING ai 1 dia (já no alvo)
  88879068, // Remarketing ai 3 dias
  90539708, // rmkt 3d acertar
  89013640, // REaquecimento Lead
  88880092, // tarefa agendada
  88879072, // lead frio
  142,      // VENda ganha
  143,      // Venda perdida
];

// (rótulos humanos pra log)
const BLOCKED_LABELS = {
  88879064: "REMARKETING ai 1 dia",
  88879068: "Remarketing ai 3 dias",
  90539708: "rmkt 3d acertar",
  89013640: "REaquecimento Lead",
  88880092: "tarefa agendada",
  88879072: "lead frio",
  142: "VENda ganha",
  143: "Venda perdida",
};

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

// ==============================
// 🔒 Rate limit & Retry settings
// ==============================
const MIN_GAP_MS         = Number(process.env.KOMMO_MIN_GAP_MS || 20000); // 20s entre chamadas
const MAX_RETRIES        = Number(process.env.KOMMO_MAX_RETRIES || 5);
const BACKOFF_BASE_MS    = Number(process.env.KOMMO_BACKOFF_BASE_MS || 1000);
const BACKOFF_MAX_MS     = Number(process.env.KOMMO_BACKOFF_MAX_MS || 15000);
const SLEEP_ON_IGNORE_MS = Number(process.env.SLEEP_ON_IGNORE_MS || 20000);     // 20s mesmo em ignorados
const SLEEP_ON_MOVE_MS   = Number(process.env.SLEEP_ON_MOVE_MS || 5 * 60 * 1000); // 5 min após mover

let lastHitAt = 0;
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function rateGate() {
  const now = Date.now();
  const wait = lastHitAt + MIN_GAP_MS - now;
  if (wait > 0) await delay(wait);
  lastHitAt = Date.now();
}

async function kommoRequest(method, url, { params, data } = {}, attempt = 0) {
  await rateGate();
  try {
    return await axios({
      method,
      url: `${KOMMO_BASE_URL}${url}`,
      headers,
      params,
      data,
      timeout: 30_000,
    });
  } catch (err) {
    const status = err.response?.status;
    const retryAfterHeader =
      err.response?.headers?.["retry-after"] || err.headers?.["retry-after"];
    const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 0;

    if ((status === 429 || (status >= 500 && status < 600)) && attempt < MAX_RETRIES) {
      const base = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * (2 ** attempt));
      const jitter = Math.floor(Math.random() * 300);
      const sleep = Math.max(base + jitter, retryAfterSec * 1000);
      console.warn(`⏳ Kommo ${status} — backoff ${sleep}ms (tentativa ${attempt + 1}/${MAX_RETRIES})`);
      await delay(sleep);
      return kommoRequest(method, url, { params, data }, attempt + 1);
    }
    throw err;
  }
}

// ------- regras -------
function inatividadeEntre1e3Dias(ts) {
  if (!ts) return false;
  const diff = Date.now() - Number(ts);
  const UM_DIA = 24 * 60 * 60 * 1000;
  return diff >= UM_DIA && diff <= 3 * UM_DIA;
}

async function leadPossuiTagBoleto(leadId) {
  try {
    const res = await kommoRequest("get", `/api/v4/leads/${leadId}`, {
      params: { with: "tags" },
    });
    const tags = res.data._embedded?.tags || [];
    return tags.some(t => (t.name || "").toLowerCase() === TAG_BOLETO.toLowerCase());
  } catch (e) {
    console.error(`❌ Erro ao ler tags do lead ${leadId}: ${e.message}`);
    return false; // não bloqueia por erro
  }
}

/**
 * Decide se deve mover e retorna detalhes.
 * Se mover=true, inclui o lead candidato (candidateLeadId) que está apto a receber o PATCH.
 */
async function deveMoverContato(telefone) {
  const tel = telefone.startsWith("+") ? telefone : `+${telefone}`;

  const res = await kommoRequest("get", `/api/v4/contacts`, {
    params: { query: tel, with: "leads" },
  });

  const contact = res.data._embedded?.contacts?.[0];
  if (!contact) {
    return {
      mover: false,
      motivo: "contato_inexistente",
      motivo_detalhe: "Nenhum contato encontrado para este telefone.",
    };
  }

  const leadsBasicos = contact._embedded?.leads || [];
  if (!leadsBasicos.length) {
    return {
      mover: false,
      motivo: "sem_leads",
      motivo_detalhe: "Contato existe, mas não possui leads.",
    };
  }

  let temLeadNoPipeline = false;
  let candidateLeadId = null;

  for (const lb of leadsBasicos) {
    const det = await kommoRequest("get", `/api/v4/leads/${lb.id}`, {
      params: { with: "pipeline,status" },
    });
    const pipelineId = Number(det.data?.pipeline_id);
    const statusId   = Number(det.data?.status_id);

    console.log(`🔎 Lead ${lb.id} -> pipeline=${pipelineId} status=${statusId}`);
    if (pipelineId !== PIPELINE_ID) continue;
    temLeadNoPipeline = true;

    if (BLOCKED_STATUS_IDS.includes(statusId)) {
      const label = BLOCKED_LABELS[statusId] || "estágio bloqueado";
      const motivo = statusId === TARGET_STAGE_ID ? "ja_no_target" : `status_bloqueado_${statusId}`;
      return {
        mover: false,
        motivo,
        motivo_detalhe: statusId === TARGET_STAGE_ID
          ? `Já está no destino (${statusId} - ${label}).`
          : `Está em ${statusId} - ${label}, que é bloqueado.`,
        leadId: lb.id,
        pipelineId,
        statusId,
      };
    }

    const temTag = await leadPossuiTagBoleto(lb.id);
    if (temTag) {
      return {
        mover: false,
        motivo: "tag_boleto_pipeline",
        motivo_detalhe: "Lead possui tag 'boletopipeline' (bloqueio).",
        leadId: lb.id,
        pipelineId,
        statusId,
      };
    }

    // elegível — se houver mais de um, usamos o último elegível encontrado
    candidateLeadId = lb.id;
  }

  if (!temLeadNoPipeline) {
    return {
      mover: false,
      motivo: "fora_pipeline_7471539",
      motivo_detalhe: "Nenhum lead do contato está no pipeline 7471539.",
    };
  }

  if (!candidateLeadId) {
    // tem lead no pipeline, mas nenhum elegível (ex.: todos bloqueados por motivo acima — teria retornado antes)
    return {
      mover: false,
      motivo: "sem_lead_elegivel",
      motivo_detalhe: "Nenhum lead do pipeline está elegível após verificar bloqueios.",
    };
  }

  return {
    mover: true,
    motivo: "ok_mover_para_target",
    motivo_detalhe: "Elegível para mover ao estágio-alvo.",
    candidateLeadId,
  };
}

// ------- mover (PATCH direto na Kommo) -------
async function moverLeadParaDestino(leadId) {
  const payload = [{ id: leadId, pipeline_id: PIPELINE_ID, status_id: TARGET_STAGE_ID }];
  await kommoRequest("patch", "/api/v4/leads", { data: payload });
  console.log(`✅ PATCH lead=${leadId} => pipeline=${PIPELINE_ID} status=${TARGET_STAGE_ID}`);
  return true;
}

/* =========================
   Relatórios (CSV/JSON)
   ========================= */
const EXPORT_DIR = process.env.MOVES_EXPORT_DIR
  ? path.resolve(process.env.MOVES_EXPORT_DIR)
  : path.resolve(process.cwd(), "exports");

function tsFile() {
  const d = new Date();
  const p = (n)=> String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

function toCsvGeneric(header, rows) {
  const esc = (v)=> `"${String(v ?? "").replace(/"/g,'""')}"`;
  const lines = [header.join(",")];
  for (const r of rows) lines.push(header.map(h => esc(r[h])).join(","));
  return lines.join("\n");
}

async function salvarCSV(prefix, header, rows) {
  await fs.mkdir(EXPORT_DIR, { recursive: true });
  const csvPath = path.join(EXPORT_DIR, `${prefix}-${tsFile()}.csv`);
  await fs.writeFile(csvPath, toCsvGeneric(header, rows), "utf8");
  console.log(`📝 CSV salvo: ${csvPath}`);
  return csvPath;
}

async function salvarJSON(prefix, rows) {
  if (String(process.env.SAVE_JSON).toLowerCase() !== "true") return null;
  const jsonPath = path.join(EXPORT_DIR, `${prefix}-${tsFile()}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(rows, null, 2), "utf8");
  console.log(`📝 JSON salvo: ${jsonPath}`);
  return jsonPath;
}

async function salvarRelatorios({ movedRows, allRows }) {
  const headerAll = [
    "telefone","resultado","motivo","motivo_detalhe",
    "kommo_lead_id","pipeline_id","status_id",
    "pause_global","pause_individual","processed_at"
  ];
  const headerMoved = ["telefone","to_pipeline","to_status","moved_at"];

  if (allRows.length) {
    await salvarCSV("todos-remarketing", headerAll, allRows);
    await salvarJSON("todos-remarketing", allRows);
  } else {
    console.log("ℹ️ Nenhum contato processado para o relatório completo.");
  }

  if (movedRows.length) {
    await salvarCSV("movidos-remarketing", headerMoved, movedRows);
    await salvarJSON("movidos-remarketing", movedRows);
  } else {
    console.log("ℹ️ Nenhum contato movido — CSV de movidos não será gerado.");
  }
}

/* =========================
   MAIN (script)
   ========================= */
async function main() {
  const pausedGlobal = await isBotPausado();
  console.log(`🧭 Contexto de execução: pause_global=${pausedGlobal}`);

  const contatos = await getTodosUsuariosComStageESemInteracao();
  const contatosParados = contatos.filter(c => inatividadeEntre1e3Dias(c.ultimaInteracao));
  console.log(`🔍 Encontrados ${contatosParados.length} contatos com inatividade entre 1 e 3 dias.`);

  let movidos = 0, ignorados = 0, erros = 0;
  const movedRows = [];
  const allRows = [];

  for (const { sender } of contatosParados) {
    const pausedUser = await isBotPausadoParaUsuario(sender);
    const telefone = normalizePhone(sender);
    console.log(`📌 Lead alvo: tel=${telefone} | user_id=${sender} | pause_global=${pausedGlobal} | pause_individual=${pausedUser}`);

    const processedAt = new Date().toISOString();

    try {
      const res = await deveMoverContato(telefone);

      if (!res.mover) {
        ignorados++;
        console.log(
          `⏭️ resultado=ignorado | tel=${telefone} | motivo=${res.motivo}` +
          (res.motivo_detalhe ? ` | detalhe="${res.motivo_detalhe}"` : "") +
          (res.leadId ? ` | lead_id=${res.leadId}` : "") +
          (res.pipelineId ? ` | pipeline=${res.pipelineId}` : "") +
          (res.statusId ? ` | status=${res.statusId} (${BLOCKED_LABELS[res.statusId] || "-"})` : "") +
          ` | pause_global=${pausedGlobal} | pause_individual=${pausedUser}`
        );
        allRows.push({
          telefone,
          resultado: "ignorado",
          motivo: res.motivo,
          motivo_detalhe: res.motivo_detalhe || "",
          kommo_lead_id: res.leadId || "",
          pipeline_id: res.pipelineId || "",
          status_id: res.statusId || "",
          pause_global: String(pausedGlobal),
          pause_individual: String(pausedUser),
          processed_at: processedAt,
        });
        await delay(SLEEP_ON_IGNORE_MS);
        continue;
      }

      console.log(`➡️ ação=mover | tel=${telefone} | lead_id=${res.candidateLeadId} | to_pipeline=${PIPELINE_ID} | to_status=${TARGET_STAGE_ID}`);
      await rateGate(); // gap antes do PATCH final
      await moverLeadParaDestino(res.candidateLeadId);

      movidos++;
      movedRows.push({
        telefone,
        to_pipeline: PIPELINE_ID,
        to_status: TARGET_STAGE_ID,
        moved_at: new Date().toISOString(),
      });
      allRows.push({
        telefone,
        resultado: "movido",
        motivo: "ok_mover_para_target",
        motivo_detalhe: "Movido para o estágio-alvo.",
        kommo_lead_id: res.candidateLeadId,
        pipeline_id: PIPELINE_ID,
        status_id: TARGET_STAGE_ID,
        pause_global: String(pausedGlobal),
        pause_individual: String(pausedUser),
        processed_at: processedAt,
      });
      console.log(`✅ resultado=movido | tel=${telefone} | lead_id=${res.candidateLeadId}`);

      await delay(SLEEP_ON_MOVE_MS);
    } catch (err) {
      erros++;
      console.error(`❌ resultado=erro | tel=${telefone} | detalhe=${err?.response?.status || ""} ${err?.message || err}`);
      allRows.push({
        telefone,
        resultado: "erro",
        motivo: "exception",
        motivo_detalhe: err?.response?.data ? JSON.stringify(err.response.data) : (err.message || "Erro desconhecido"),
        kommo_lead_id: "",
        pipeline_id: "",
        status_id: "",
        pause_global: String(pausedGlobal),
        pause_individual: String(pausedUser),
        processed_at: processedAt,
      });
      await delay(Math.min(BACKOFF_BASE_MS, 2000));
    }
  }

  await salvarRelatorios({ movedRows, allRows });
  console.log(`🏁 Fim do job | movidos=${movidos} | ignorados=${ignorados} | erros=${erros} | pause_global=${pausedGlobal}`);
}

// executa
main()
  .then(() => {
    console.log("✅ Execução concluída (CLI).");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Erro na execução (CLI):", err?.response?.data || err?.message || err);
    process.exit(1);
  });
