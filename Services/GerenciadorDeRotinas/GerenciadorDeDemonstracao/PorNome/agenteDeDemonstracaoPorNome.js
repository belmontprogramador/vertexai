const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  appendToConversation,
  getConversation,
  getNomeUsuario
} = require("../../../redisService");
const { getAllCelulares } = require('../../../dbService')

const fs = require("fs");
const axios = require("axios");
require("dotenv").config();

const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); 

const obterModelosDoBling = async () => {
  try {
    const celulares = await getAllCelulares(); 

    const termosIgnorados = [
      "BLACK", "WHITE", "BLUE", "GREEN", "GOLD", "PURPLE", "SILVER", "CORAL",
      "MIDNIGHT", "OCEAN", "TEAL", "AZUL", "VERDE", "LAVENDER", "VOYAGE",
      "MARBLE", "STORM", "LIGHTNING", "SPARKLE", "DARK", "LIME", "STAR", "STARRY",
      "OCÉANO", "ROM", "RAM"
    ];

    const normalizeNome = (nome) => nome
    .replace(/^smartphone\s*/i, "")
    .replace(/[^\w\s]/gi, '') // remove símbolos como * ou 🔥
    .trim()
    .split(/\s+/)
    .filter(p => !termosIgnorados.includes(p.toUpperCase()))
    .join(" ")
    .toLowerCase()
    .trim();

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

const agenteDeDemonstracaoPorNome = async ({ sender, msgContent, modeloMencionado }) => {
  await appendToConversation(sender, msgContent);
  const historico = await getConversation(sender);
  const conversaCompleta = historico.map(f => f.replace(/^again\s*/i, "").trim()).slice(-10).join(" | ");

  const listaModelos = await obterModelosDoBling();
  let modelo = listaModelos.find(m => 
    m.nome.toLowerCase() === modeloMencionado.toLowerCase()
  );
  
  // Fallback: se não achou nome exato, tenta por includes
  if (!modelo) {
    const similares = listaModelos.filter(m =>
      m.nome.toLowerCase().includes(modeloMencionado.toLowerCase())
    );
  
    if (similares.length === 1) {
      modelo = similares[0];
    } else if (similares.length > 1) {
      await setUserStage(sender, "identificar_modelo_por_nome_pos_demonstração");
      await sendBotMessage(sender, "identificar_modelo_por_nome_pos_demonstração");
  
      for (const modeloSugerido of similares) {
        const textoFormatado = `
  🔥 *${modeloSugerido.nome}* 🔥
  
  ${modeloSugerido.subTitulo || ""}
  
  ${modeloSugerido.descricaoCurta || ""}
  
  ${modeloSugerido.precoParcelado ? `💰📦 ${modeloSugerido.precoParcelado}` : ""}
  ${modeloSugerido.fraseImpacto ? `\n\n${modeloSugerido.fraseImpacto}` : ""}
  \n💵 *Preço:* R$ ${modeloSugerido.preco.toFixed(2)}
  `.trim();
  
        await sendBotMessage(sender, {
          imageUrl: modeloSugerido.imagemURL,
          caption: textoFormatado
        });
  
        await appendToConversation(sender, `modelo_sugerido: ${modeloSugerido.nome}`);
      }
  
      await sendBotMessage(sender, "➡️ Qual desses modelos mais chamou sua atenção?");
      return;
    } else {
      await setUserStage(sender, "identificar_modelo_por_nome");
      return await sendBotMessage(sender, `❌ Esse modelo não está disponível. Pode confirmar ou escolher outro da lista?`);
    }
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

  await appendToConversation(sender, `modelo_sugerido_json: ${JSON.stringify(modelo)}`);
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await delay(1000);

   const nome  = await getNomeUsuario(sender)
  await sendBotMessage(sender, `📣 ${nome} temos esse modelo a pronta entrega. Vou te passar todas a informações sobre ele?`);
  await setUserStage(sender, "identificar_modelo_por_nome_pos_demonstração");
};


module.exports = { agenteDeDemonstracaoPorNome };
