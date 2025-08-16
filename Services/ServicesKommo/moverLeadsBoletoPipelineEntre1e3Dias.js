#!/usr/bin/env node
// scripts/moverLeadsBoletoEntre1e3Dias.cli.js
// ▶️ Executa: node scripts/moverLeadsBoletoEntre1e3Dias.cli.js
// ▶️ Import: const { moverLeadsBoletoEntre1e3Dias } = require("./scripts/moverLeadsBoletoEntre1e3Dias.cli");

"use strict";

/* =========================================
   Carregamento de .env robusto (múltiplos caminhos)
   ========================================= */
const fsSync = require("fs");
const path = require("path");
const dotenv = require("dotenv");
(function loadEnv() {
  dotenv.config(); // cwd
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

/* =============
   Dependências
   ============= */
const fs = require("fs/promises");
const axios = require("axios");

/* =======================================
   Imports tolerantes (ajuste os paths se precisar)
   ======================================= */
let getTodosUsuariosComStageESemInteracao, isBotPausado, isBotPausadoParaUsuario;
let normalizePhone, getUltimaInteracaoPorLeadId;
try {
  ({
    getTodosUsuariosComStageESemInteracao,
    isBotPausado,
    isBotPausadoParaUsuario,
    getUltimaInteracaoPorLeadId,
  } = require("../redisService"));
  ({ normalizePhone } = require("../Services/normalizePhone"));
} catch {
  try {
    ({
      getTodosUsuariosComStageESemInteracao,
      isBotPausado,
      isBotPausadoParaUsuario,
      getUltimaInteracaoPorLeadId,
    } = require("../redisService"));
    ({ normalizePhone } = require("../normalizePhone"));
  } catch (e2) {
    console.error("❌ Ajuste os paths dos imports (redisService/normalizePhone).", e2.message);
    process.exit(1);
  }
}

/* ============
   Constantes
   ============ */
const KOMMO_BASE_URL = process.env.KOMMO_BASE_URL || "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;
if (!KOMMO_TOKEN) {
  console.error("❌ KOMMO_TOKEN ausente. Certifique-se de que o .env foi carregado.");
  process.exit(1);
}

// Pipelines / destino (BOLETO)
const PIPELINE_COMERCIAL_ID = 7471539;     // Comercial
const PIPELINE_BOLETO_ID   = 11573376;     // NOVO COMERCIAL VERTEX BOLETO
const DEST_PIPELINE_ID     = PIPELINE_BOLETO_ID;
const DEST_STAGE_ID        = 88878664;     // remkeing 1 dia

// Regras específicas
const TAG_BOLETO = "boletopipeline";       // exigida para mover
const CONSIDER_PIPELINES = new Set([PIPELINE_COMERCIAL_ID, PIPELINE_BOLETO_ID]);

// Estágios bloqueados por pipeline
const BLOCK_747 = new Set([
  61175943, // aTENDIMENTO aI
  61175951, // ATENDIMENTO hUMANO
  88879064, // REMARKETING ai 1 dia
  88879068, // Remarketing ai 3 dias
  90539708, // rmkt 3d acertar
  89013640, // REaquecimento Lead
  88880092, // tarefa agendada
  88879072, // lead frio
  142,      // VENda ganha
  143,      // Venda perdida
]);
const BLOCK_115 = new Set([
  88878664, // remkeing 1 dia (destino)
  88878668, // remarketing 3 dias
  89186192, // Reaquecimneto de lead
  89186196, // Tarefa agendada
  89892884, // Disparo api Boleto
  89995348, // feitos
  89995508, // feitos api
  89186200, // lead frio
  142,      // venda ganha
  143,      // Venda perdida
]);

// (rótulos humanos pra log) — opcional
const STATUS_LABELS = {
  61175943: "aTENDIMENTO aI",
  61175951: "ATENDIMENTO hUMANO",
  88879064: "REMARKETING ai 1 dia",
  88879068: "Remarketing ai 3 dias",
  90539708: "rmkt 3d acertar",
  89013640: "REaquecimento Lead",
  88880092: "tarefa agendada",
  88879072: "lead frio",
  142: "VENda ganha",
  143: "Venda perdida",
  88878664: "remkeing 1 dia",
  88878668: "remarketing 3 dias",
  89186192: "Reaquecimneto de lead",
  89186196: "Tarefa agendada",
  89892884: "Disparo api Boleto",
  89995348: "feitos",
  89995508: "feitos api",
  89186200: "lead frio (boleto)",
};

const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json",
};

/* ==============================
   Rate limit & Retry com backoff
   ============================== */
const MIN_GAP_GET_MS     = Number(process.env.KOMMO_MIN_GAP_GET_MS || 2000);    // GETs mais rápidos
const MIN_GAP_PATCH_MS   = Number(process.env.KOMMO_MIN_GAP_PATCH_MS || 20000); // PATCH protegido
const MAX_RETRIES        = Number(process.env.KOMMO_MAX_RETRIES || 5);
const BACKOFF_BASE_MS    = Number(process.env.KOMMO_BACKOFF_BASE_MS || 1000);
const BACKOFF_MAX_MS     = Number(process.env.KOMMO_BACKOFF_MAX_MS || 15000);
const SLEEP_ON_IGNORE_MS = Number(process.env.SLEEP_ON_IGNORE_MS || 20000);     // 20s mesmo em ignorados
const SLEEP_ON_MOVE_MS   = Number(process.env.SLEEP_ON_MOVE_MS || 5 * 60 * 1000); // 5 min após mover

let lastHitGetAt = 0;
let lastHitPatchAt = 0;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function rateGate(kind /* 'GET' | 'PATCH' */) {
  const now = Date.now();
  const minGap = kind === "PATCH" ? MIN_GAP_PATCH_MS : MIN_GAP_GET_MS;
  const last   = kind === "PATCH" ? lastHitPatchAt : lastHitGetAt;
  const wait   = last + minGap - now;
  if (wait > 0) await delay(wait);
  if (kind === "PATCH") lastHitPatchAt = Date.now(); else lastHitGetAt = Date.now();
}

async function kommoRequest(method, url, { params, data } = {}, attempt = 0) {
  await rateGate(method.toUpperCase() === "PATCH" ? "PATCH" : "GET");
  try {
    return await axios({
      method,
      url: `${KOMMO_BASE_URL}${url}`,
      headers,
      params,
      data,
      timeout: 30000,
    });
  } catch (err) {
    const status = err.response?.status;
    const retryAfterHeader = err.response?.headers?.["retry-after"] || err.headers?.["retry-after"];
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

/* =====================
   Utilitários de regra
   ===================== */
function interacaoEntre1e3Dias(ts) {
  if (!ts) return false;
  const diff = Date.now() - Number(ts);
  const UM_DIA = 24 * 60 * 60 * 1000;
  return diff >= UM_DIA && diff <= 3 * UM_DIA;
}

function statusBloqueado(pipelineId, statusId) {
  if (pipelineId === PIPELINE_COMERCIAL_ID) return BLOCK_747.has(statusId);
  if (pipelineId === PIPELINE_BOLETO_ID) return BLOCK_115.has(statusId);
  return false;
}

function labelStatus(id) {
  return STATUS_LABELS[id] || String(id);
}

/* ==================
   Helpers da Kommo
   ================== */
async function getContatoPorTelefone(telefoneE164) {
  const res = await kommoRequest("get", `/api/v4/contacts`, {
    params: { query: telefoneE164, with: "leads" },
  });
  return res.data?._embedded?.contacts?.[0] || null;
}

async function getLeadDetalhe(leadId, withStr = "pipeline,status,tags") {
  const res = await kommoRequest("get", `/api/v4/leads/${leadId}`, { params: { with: withStr } });
  return res.data;
}

/* =========================================
   Decisão por telefone (deveMoverContato)
   ========================================= */
async function deveMoverContato(telefone) {
  const tel = telefone.startsWith("+") ? telefone : `+${telefone}`;

  const contact = await getContatoPorTelefone(tel);
  if (!contact) {
    return { mover: false, motivo: "contato_inexistente", motivo_detalhe: "Nenhum contato encontrado para este telefone." };
  }

  const leadsBasicos = contact._embedded?.leads || [];
  if (!leadsBasicos.length) {
    return { mover: false, motivo: "sem_leads", motivo_detalhe: "Contato existe, mas não possui leads." };
  }

  let candidateLeadId = null;

  for (const lb of leadsBasicos) {
    const det = await getLeadDetalhe(lb.id, "pipeline,status,tags");
    const pipelineId = Number(det.pipeline_id);
    const statusId   = Number(det.status_id);

    if (!CONSIDER_PIPELINES.has(pipelineId)) {
      console.log(`🔎 Lead ${lb.id} descartado: pipeline_fora_do_escopo (pipeline=${pipelineId})`);
      continue;
    }

    if (statusBloqueado(pipelineId, statusId)) {
      console.log(`🔎 Lead ${lb.id} descartado: status_bloqueado (pipeline=${pipelineId} status=${statusId} ${labelStatus(statusId)})`);
      continue;
    }

    const tags = det._embedded?.tags || [];
    const temTag = tags.some(t => (t.name || "").toLowerCase() === TAG_BOLETO.toLowerCase());
    if (!temTag) {
      console.log(`🔎 Lead ${lb.id} descartado: sem_tag '${TAG_BOLETO}'`);
      continue;
    }

    const ultimaInteracao = await getUltimaInteracaoPorLeadId(lb.id);
    const interacaoOK = interacaoEntre1e3Dias(ultimaInteracao ? Number(ultimaInteracao) : null);
    if (!interacaoOK) {
      console.log(`🔎 Lead ${lb.id} descartado: fora_janela (ultimaInteracao=${ultimaInteracao || null})`);
      continue;
    }

    console.log(`✅ Lead ${lb.id} ELEGÍVEL (pipeline=${pipelineId} status=${statusId} ${labelStatus(statusId)})`);
    candidateLeadId = lb.id; // mantém o último elegível
  }

  if (!candidateLeadId) {
    return { mover: false, motivo: "sem_lead_elegivel", motivo_detalhe: "Nenhum lead elegível após verificar regras do fluxo BOLETO." };
  }

  return {
    mover: true,
    motivo: "ok_mover_para_target",
    motivo_detalhe: "Elegível para mover ao pipeline/stage de BOLETO.",
    candidateLeadId,
  };
}

/* ============================
   PATCH: mover lead ao destino
   ============================ */
async function moverLeadParaDestino(leadId) {
  const payload = [{ id: leadId, pipeline_id: DEST_PIPELINE_ID, status_id: DEST_STAGE_ID }];
  await kommoRequest("patch", "/api/v4/leads", { data: payload });
  console.log(`✅ PATCH lead=${leadId} => pipeline=${DEST_PIPELINE_ID} status=${DEST_STAGE_ID}`);
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
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

function toCsvGeneric(header, rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [header.join(",")];
  for (const r of rows) lines.push(header.map((h) => esc(r[h])).join(","));
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
    await salvarCSV("todos-remarketing-boleto", headerAll, allRows);
    await salvarJSON("todos-remarketing-boleto", allRows);
  } else {
    console.log("ℹ️ Nenhum contato processado para o relatório completo.");
  }

  if (movedRows.length) {
    await salvarCSV("movidos-remarketing-boleto", headerMoved, movedRows);
    await salvarJSON("movidos-remarketing-boleto", movedRows);
  } else {
    console.log("ℹ️ Nenhum contato movido — CSV de movidos não será gerado.");
  }
}

/* =========================
   FUNÇÃO PRINCIPAL EXPORTADA
   ========================= */
async function moverLeadsBoletoEntre1e3Dias() {
  const pausedGlobal = await isBotPausado();
  console.log(`🧭 Contexto de execução: pause_global=${pausedGlobal}`);

  const contatos = await getTodosUsuariosComStageESemInteracao();
  const contatosParados = contatos.filter((c) => interacaoEntre1e3Dias(c.ultimaInteracao));
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
          (res.leadId ? ` | lead_id=${res.leadId}` : "")
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

      console.log(`➡️ ação=mover | tel=${telefone} | lead_id=${res.candidateLeadId} | to_pipeline=${DEST_PIPELINE_ID} | to_status=${DEST_STAGE_ID}`);
      await rateGate("PATCH");
      await moverLeadParaDestino(res.candidateLeadId);

      movidos++;
      movedRows.push({
        telefone,
        to_pipeline: DEST_PIPELINE_ID,
        to_status: DEST_STAGE_ID,
        moved_at: new Date().toISOString(),
      });
      allRows.push({
        telefone,
        resultado: "movido",
        motivo: "ok_mover_para_target",
        motivo_detalhe: "Movido para o estágio-alvo (BOLETO).",
        kommo_lead_id: res.candidateLeadId,
        pipeline_id: DEST_PIPELINE_ID,
        status_id: DEST_STAGE_ID,
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

/* ==========
   Execução CLI
   ========== */
if (require.main === module) {
  moverLeadsBoletoEntre1e3Dias()
    .then(() => {
      console.log("✅ Execução concluída (CLI).");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Erro na execução (CLI):", err?.response?.data || err?.message || err);
      process.exit(1);
    });
}

/* ==========
   Export
   ========== */
module.exports = { moverLeadsBoletoEntre1e3Dias };
