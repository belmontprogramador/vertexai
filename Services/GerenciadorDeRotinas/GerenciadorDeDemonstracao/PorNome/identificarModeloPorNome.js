const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage, 
  appendToConversation, 
  getNomeUsuario,  
} = require("../../../redisService");
const { getAllCelulares } = require('../../../dbService')
const { agenteDeDemonstracaoPorNome } = require("./agenteDeDemonstracaoPorNome");
const axios = require("axios");
const fs = require("fs");
const OpenAI = require("openai");
const { sanitizarEntradaComQuoted } = require("../../../utils/utilitariosDeMensagem/sanitizarEntradaComQuoted");
const { prepararContextoDeModelosRecentes } = require("../../../utils/utilitariosDeMensagem/prepararContextoDeModelosRecentes");
 
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const obterModelosDoBling = async () => {
  try {
    const celulares = await  getAllCelulares();

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

    const mapaUnico = new Map();

    for (const c of celulares) {
      const chave = normalizeNome(c.nome);
      if (!mapaUnico.has(chave)) {
        mapaUnico.set(chave, {
          modelo: c.nome, // <- adiciona a propriedade `modelo`
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

const calcularSimilaridadePorEmbeddings = async (entrada, modelos) => {
  const entradaEmbedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: entrada
  });

  const nomesModelos = modelos.map(m => m.nome);

  const modelosEmbedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: nomesModelos
  });

  const vetorEntrada = entradaEmbedding.data[0].embedding;

  const distancias = modelosEmbedding.data.map((item, i) => {
    const modeloOriginal = modelos[i];
    const vetorModelo = item.embedding;
    const score = vetorEntrada.reduce((acc, val, idx) => acc + val * vetorModelo[idx], 0);
    return {
      imagemURL: modeloOriginal.imagemURL,
      descricaoCurta: modeloOriginal.descricaoCurta,
      modelo: modeloOriginal.nome,
      preco: modeloOriginal.preco,
      subTitulo: modeloOriginal.subTitulo,
      fraseImpacto: modeloOriginal.fraseImpacto,
      precoParcelado: modeloOriginal.precoParcelado,
      score
    };
  });

  return distancias.sort((a, b) => b.score - a.score);
};  

const identificarModeloPorNome  = async ({ sender, msgContent, pushName, quotedMessage }) => {
   
  const entrada = await sanitizarEntradaComQuoted(sender, msgContent, quotedMessage);   

  const { modelos, nomeUsuario, conversaCompleta } = await prepararContextoDeModelosRecentes(sender);   

  // 🎯 Tenta detectar similaridade de entrada com algum modelo
  const listaModelos = await obterModelosDoBling();
  const similares = await calcularSimilaridadePorEmbeddings(entrada, listaModelos);
  const maisProvavel = similares?.[0];
  console.log(`o mais provavel ${JSON.stringify(maisProvavel, null, 2)}`);

  const normalizar = (str) =>
    str.toLowerCase()
       .normalize("NFD")
       .replace(/[\u0300-\u036f]/g, "")
       .replace(/[^\w\s]/gi, "")
       .replace(/\s+/g, " ")
       .trim();
  
  const entradaNormalizada = normalizar(entrada);
  const modeloNormalizado = normalizar(maisProvavel?.modelo || maisProvavel?.nome || "");
  
  if (maisProvavel?.score > 0.82 || entradaNormalizada.includes(modeloNormalizado)) {
    await appendToConversation(sender, {
      tipo: "deliberacao_toa",
      conteudo: {
        acao: "demonstrarCelular",
        motivo: `Match forte com modelo ${maisProvavel.nome}`,
        argumento: { modeloMencionado: maisProvavel.nome }
      },
      timestamp: new Date().toISOString()
    });
  
    return await handlers.demonstrarCelular(sender, {
      modeloMencionado: maisProvavel.nome
    }, { msgContent: entrada });
  }
  
  const sugestaoModelo = maisProvavel?.modelo || null;

  // 🧠 Caso não tenha match forte, deixa TOA decidir
  const promptTOA = `
🤖 Você é Anna, assistente virtual da Vertex Store.

Seu objetivo é identificar a ação ideal com base na intenção do cliente.
📜 Histórico da conversa:
  ${conversaCompleta}

  🧠 Última mensagem do cliente:
  "${entrada}"

  📱 Modelos apresentados:
  ${modelos.map(m => `➡️ *${m.nome}*\n💵 Preço: R$ ${m.preco.toFixed(2)}`).join("\n")}

  Nome do cliente: ${nomeUsuario}

  📍 Sugestão de modelo identificado por IA:
   ${sugestaoModelo ? `*${sugestaoModelo}*` : "nenhuma"}

🎯 Ações disponíveis:
1. "demonstrarCelular" ➜ Quando a entrada indicar um modelo específico da lista.⚠️ Se essa sugestão estiver alinhada com a mensagem do cliente, use a ação "demonstrarCelular" com o campo "argumento: { modeloMencionado: "NOME DO MODELO" }".

2. "investigarMais" ➜ Quando houver dúvida, modelo genérico ou múltiplas variações.
3. "modeloInvalido" ➜ Quando o modelo não pertence às marcas Realme, Redmi ou Poco.

Retorne apenas isso:
{
  "acao": "NOME_DA_ACAO",
  "motivo": "Texto explicando por que esta ação foi escolhida",
  "argumento": {}
}
`;

  const deliberacao = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: promptTOA }],
    temperature: 0.8
  });

  const jsonMatch = deliberacao.choices?.[0]?.message?.content?.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("❌ TOA não retornou JSON válido.");
    return await sendBotMessage(sender, "⚠️ Não consegui entender sua escolha. Pode repetir?");
  }

  const { acao, motivo, argumento } = JSON.parse(jsonMatch[0]);

  console.log("🧠 TOA escolheu:", acao, "→", motivo);

  await appendToConversation(sender, {
    tipo: "deliberacao_toa",
    conteudo: { acao, motivo, argumento },
    timestamp: new Date().toISOString()
  });

  if (!handlers[acao]) {
    return await sendBotMessage(sender, "⚠️ Não entendi sua intenção. Pode repetir?");
  }

  return await handlers[acao](sender, argumento, { msgContent: entrada });
};

const formatarDescricaoParaCaption = (modelo) => {
  return (
    `🔥 *${modelo.nome}*🔥\n\n${modelo.subTitulo}\n\n${modelo.descricaoCurta}\n\n💰📦 ${modelo.precoParcelado}\n\n${modelo.fraseImpacto}\n\n💵 Preço: R$ ${modelo.preco?.toFixed(2)}`
      .replace(/\u00A0/g, ' ')
      .replace(/\u200B/g, '')
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
};

const handlers = {
  demonstrarCelular: async (sender, args, extras = {}) => {
    const { msgContent = "", quotedMessage = null } = extras;
  
    await setUserStage(sender, "identificar_modelo_por_nome_pos_demonstração");
  
    await appendToConversation(sender, {
      tipo: "modelo_confirmado",
      conteudo: args.modeloMencionado,
      timestamp: new Date().toISOString()
    });
  
    return await agenteDeDemonstracaoPorNome({
      sender,
      msgContent,
      quotedMessage,
      modeloMencionado: args.modeloMencionado
    });
  },  
  investigarMais: async (sender, args, extras) => {
    await setUserStage(sender, "identificar_modelo_por_nome_pos_demonstração");
  
    const listaCompleta = await obterModelosDoBling();
    const entrada = extras?.msgContent || "";
  
    // 🧠 Nova lógica: se o cliente mencionou uma marca genérica, mostrar todos da marca
    const entradaLower = entrada.toLowerCase();
    const marcas = ["poco", "realme", "redmi"];
    const marcaMencionada = marcas.find(marca => entradaLower.includes(marca));
  
    let modelosParaExibir = [];
  
    if (marcaMencionada) {
      modelosParaExibir = listaCompleta.filter(m =>
        m.nome.toLowerCase().includes(marcaMencionada)
      );
    } else {
      const similares = await calcularSimilaridadePorEmbeddings(entrada, listaCompleta);
      modelosParaExibir = similares.filter(m => m.score > 0.35).slice(0, 3);
    }
  
    if (modelosParaExibir.length === 0) {
      await sendBotMessage(sender, "Não consegui identificar nenhum modelo específico. Posso te mostrar algumas opções populares?");
  
      for (const modelo of listaCompleta.slice(0, 4)) {
        await sendBotMessage(sender, {
          imageUrl: modelo.imagemURL,
          caption: formatarDescricaoParaCaption(modelo)
        });
  
        await appendToConversation(sender, {
          tipo: "modelo_confirmado",
          conteudo: modelo.nome,
          timestamp: new Date().toISOString()
        });
      }
  
      return;
    }
  
    // Mostra os modelos relevantes (por marca ou similaridade)
    for (const modelo of modelosParaExibir) {
      await sendBotMessage(sender, {
        imageUrl: modelo.imagemURL,
        caption: formatarDescricaoParaCaption(modelo)
      });
  
      await appendToConversation(sender, {
        tipo: "modelo_sugerido",
        conteudo: modelo.modelo,
        timestamp: new Date().toISOString()
      });
    }

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await delay(2000);
  
    await sendBotMessage(sender, "➡️ *Desses, qual mais te chamou atenção?*");
  },  
  modeloInvalido: async (sender) => {
    return await sendBotMessage(sender, "Esse modelo não está disponível no nosso catálogo. Hoje trabalhamos apenas com *Redmi*, *Realme* e *Poco* 💜.");
  }     
};

 

module.exports = { identificarModeloPorNome };