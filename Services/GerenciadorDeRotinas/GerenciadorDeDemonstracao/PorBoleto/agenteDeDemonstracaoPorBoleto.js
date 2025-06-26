const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage, 
} = require("../../../redisService");
const {  getAllCelulareBoleto } = require('../../../dbService')
const { appendToConversation, getConversation } = require("../../../HistoricoDeConversas/conversationManager");
const { agenteDeDemonstracaoPorNomePorBoleto } = require("./agenteDeDemonstracaoPorNomePorBoleto");
const axios = require("axios");
const fs = require("fs");
const OpenAI = require("openai");
const { sanitizarEntradaComQuoted } = require("../../../utils/utilitariosDeMensagem/sanitizarEntradaComQuoted");
const { prepararContextoDeModelosRecentes } = require("../../../utils/utilitariosDeMensagem/prepararContextoDeModelosRecentes");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const obterModelosDoBling = async () => {
  try {
    const celulares = await  getAllCelulareBoleto();

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

const agenteDeDemonstracaoPorBoleto = async ({ sender, msgContent, pushName, quotedMessage }) => {
   
  const entrada = await sanitizarEntradaComQuoted(sender, msgContent, quotedMessage);   

  const { modelos, nomeUsuario, conversaCompleta } = await prepararContextoDeModelosRecentes(sender);   

  // 🎯 Tenta detectar similaridade de entrada com algum modelo
  const listaModelos = await obterModelosDoBling();
  const similares = await calcularSimilaridadePorEmbeddings(entrada, listaModelos);
  const maisProvavel = similares?.[0];
  console.log(`o mais provavel ${JSON.stringify(maisProvavel, null, 2)}`);


  if (maisProvavel?.score > 0.50) {
    console.log("✅ Entrada casa fortemente com modelo:", maisProvavel.modelo);
    await appendToConversation(sender, {
      tipo: "deliberacao_toa",
      conteudo: {
        acao: "demonstrarCelular",
        motivo: `Cliente mencionou ${maisProvavel.modelo} com alta similaridade`,
        argumento: { modeloMencionado: maisProvavel.modelo }
      },
      timestamp: new Date().toISOString()
    });

    return await handlers.demonstrarCelular(sender, {
      modeloMencionado: maisProvavel.modelo
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
    `🔥 *${modelo.nome}*🔥\n\n${modelo.subTitulo}\n\n${modelo.descricaoCurta}\n\n💰📦 ${modelo.precoParcelado}\n\n${modelo.fraseImpacto}\n\n💵`
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
  demonstrarCelular: async (sender, args, extras) => {
    await setUserStage(sender, "agente_de_demonstracao_por_nome_por_boleto");
  
    await appendToConversation(sender, {
      tipo: "modelo_confirmado",
      conteudo: args.modeloMencionado,
      timestamp: new Date().toISOString()
    });
  
    return await agenteDeDemonstracaoPorNomePorBoleto({
      sender,
      msgContent: extras.msgContent,
      modeloMencionado: args.modeloMencionado
    });
  },
  investigarMais: async (sender, args) => {
    await setUserStage(sender, "agente_de_demonstracao_pos_decisao_por_boleto");
  
    const listaCompleta = await obterModelosDoBling();
    const modelosExibidos = new Set();
  
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  
    const normalizarNome = (nome) =>
      nome?.toLowerCase().replace(/[^a-z0-9]/gi, ' ').replace(/\s+/g, ' ').trim();
  
    const exibirModelo = async (modelo) => {
      const nomeModeloKey = normalizarNome(modelo.nome);
      if (modelosExibidos.has(nomeModeloKey)) return;
      modelosExibidos.add(nomeModeloKey);
  
      const textoFormatado = formatarDescricaoParaCaption(modelo);
  
      await sendBotMessage(sender, {
        imageUrl: modelo.imagemURL,
        caption: textoFormatado
      });
  
      await appendToConversation(sender, {
        tipo: "modelo_sugerido",
        conteudo: modelo.nome,
        timestamp: new Date().toISOString()
      });
    };
  
    // 🔍 1. IA NÃO enviou lista de modelos, tentar extrair de blocos com "🔥"
    if (!Array.isArray(args.modelos)) {
      console.warn("⚠️ IA não enviou modelos estruturados. Convertendo string para blocos individuais.");
  
      const blocos = (args.pergunta || "").split("🔥").map(b => b.trim()).filter(Boolean);
      let encontrouModeloRelacionado = false;
  
      for (const bloco of blocos) {
        const nomeBlocoNormalizado = normalizarNome(bloco);
  
        const relacionados = listaCompleta.filter(m => {
          const nomeModelo = normalizarNome(m.nome);
          return nomeModelo.includes(nomeBlocoNormalizado);
        });
  
        if (relacionados.length > 0) {
          encontrouModeloRelacionado = true;
          for (const modelo of relacionados) {
            await exibirModelo(modelo);
          }
        }
      }
  
      // 🔁 Se nenhum reconhecido, mostrar modelos genéricos
      if (!encontrouModeloRelacionado) {
        console.log("⚠️ Nenhum modelo reconhecido. Mostrando todos os modelos disponíveis.");
        const fallback = listaCompleta.slice(0, 6);
        for (const modelo of fallback) {
          await exibirModelo(modelo);
        }
      }
  
      await delay(2000);
      await sendBotMessage(sender, "➡️ *Desses, qual mais te chamou atenção?*");
      return;
    }
  
    // 🔍 2. IA ENVIOU modelos (nomes ou objetos)
    const ehListaDeNomes = args.modelos.every((m) => typeof m === "string");
  
    let modelosParaExibir = [];
  
    if (ehListaDeNomes) {
      modelosParaExibir = args.modelos.map(nomeIA => {
        const nomeNormalizado = normalizarNome(nomeIA);
        return listaCompleta.find(modelo => normalizarNome(modelo.nome) === nomeNormalizado);
      }).filter(Boolean);
    } else {
      modelosParaExibir = args.modelos.map(objIA => {
        const nomeNormalizado = normalizarNome(objIA?.nome);
        const modelo = listaCompleta.find(m => normalizarNome(m.nome) === nomeNormalizado);
        return modelo ? { ...modelo } : null;
      }).filter(Boolean);
    }
  
    for (const modelo of modelosParaExibir) {
      await exibirModelo(modelo);
    }
  
    await delay(2000);
    await sendBotMessage(sender, "➡️ *Desses, qual mais te chamou atenção?*");
  },
    modeloInvalido: async (sender) => {
    return await sendBotMessage(sender, "Esse modelo não está disponível no nosso catálogo. Hoje trabalhamos apenas com *Redmi*, *Realme* e *Poco* 💜.");
  }     
};
 

module.exports = { agenteDeDemonstracaoPorBoleto };