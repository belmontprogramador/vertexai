const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  getNomeUsuario
} = require("../../../redisService");
const { getAllCelulareBoleto } = require("../../../dbService");
const { appendToConversation, getConversation } = require("../../../HistoricoDeConversas/conversationManager");


const fs = require("fs");
const axios = require("axios");
require("dotenv").config();

const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const termosIgnorados = [
  "BLACK", "WHITE", "BLUE", "GREEN", "GOLD", "PURPLE", "SILVER", "CORAL",
  "MIDNIGHT", "OCEAN", "TEAL", "AZUL", "VERDE", "LAVENDER", "VOYAGE",
  "MARBLE", "STORM", "LIGHTNING", "SPARKLE", "DARK", "LIME", "STAR", "STARRY",
  "OCÉANO", "ROM", "RAM"
];

const normalizeNome = (nome) => nome
  .replace(/^smartphone\s*/i, "")
  .replace(/[^\w\s]/gi, '')
  .trim()
  .split(/\s+/)
  .filter(p => !termosIgnorados.includes(p.toUpperCase()))
  .join(" ")
  .toLowerCase()
  .trim();

const obterModelosDoBling = async () => {
  try {
    const celulares = await getAllCelulareBoleto();
   

    const mapaUnico = new Map();

    for (const c of celulares) {
      const chave = normalizeNome(c.nome);
      if (!mapaUnico.has(chave)) {
        mapaUnico.set(chave, {
          nome: c.nome,
          preco: c.preco,
          descricaoCurta: c.descricao,
          imagemURL: c.imageURL,
          precoParcelado: c.precoParcelado,
          fraseImpacto: c.fraseImpacto,
          subTitulo: c.subTitulo
        });
      }
    }

    const listaParaPrompt = Array.from(mapaUnico.values());

    console.log("📦 Modelos carregados do banco:");
    listaParaPrompt.forEach(m => console.log("-", m.nome));

    return listaParaPrompt;
  } catch (err) {
    console.error("❌ Erro ao carregar modelos do banco:", err);
    return [];
  }
};

const agenteDeDemonstracaoPorNomePorBoleto = async ({ sender, msgContent, modeloMencionado }) => {
  await appendToConversation(sender, {
    tipo: "entrada_usuario",
    conteudo: msgContent,
    timestamp: new Date().toISOString()
  });

  const historico = await getConversation(sender);
  const conversaCompleta = historico
    .filter(f => f.tipo === "entrada_usuario")
    .map(f => f.conteudo.replace(/^again\s*/i, "").trim())
    .slice(-10)
    .join(" | ");

  const listaModelos = await obterModelosDoBling();

  const modelo = listaModelos.find(m =>
    normalizeNome(m.nome) === normalizeNome(modeloMencionado)
  );  

  if (!modelo) {
    await setUserStage(sender, "agente_de_demonstração_por_boleto");
    return await sendBotMessage(sender, `❌ Esse modelo não está disponível. Pode confirmar ou escolher outro da lista?`);
  }

  const textoFormatado = `
🔥 *${modelo.nome}* 🔥

${modelo.subTitulo || ""}

${modelo.descricaoCurta || ""}

${modelo.precoParcelado ? `💰📦 ${modelo.precoParcelado}` : ""}
${modelo.fraseImpacto ? `\n\n${modelo.fraseImpacto}` : ""}
\n💵 *Preço:* R$ ${modelo.preco.toFixed(2)}
`.trim();

  await sendBotMessage(sender, {
    imageUrl: modelo.imagemURL,
    caption: textoFormatado
  });

  await appendToConversation(sender, {
    tipo: "modelo_sugerido_json",
    conteudo: modelo,
    timestamp: new Date().toISOString()
  });

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await delay(1000);

  const nome = await getNomeUsuario(sender);
  await sendBotMessage(sender, `📣 ${nome} temos esse modelo a pronta entrega. Vou te passar todas a informações sobre ele?`);
  await setUserStage(sender, "agente_de_demonstracao_pos_decisao_por_boleto");
};

module.exports = { agenteDeDemonstracaoPorNomePorBoleto };