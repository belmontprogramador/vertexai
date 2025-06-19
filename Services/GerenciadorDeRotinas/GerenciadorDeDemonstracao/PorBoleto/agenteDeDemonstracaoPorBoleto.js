const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage, 
  appendToConversation,
  getConversation,
  getNomeUsuario,
  getUserStage
} = require("../../../redisService");
const {  getAllCelulareBoleto } = require('../../../dbService')
const { appendToConversation, getConversation } = require("../../../conversationManager");
const { agenteDeDemonstracaoPorNomePorBoleto } = require("./agenteDeDemonstracaoPorNomePorBoleto");
const axios = require("axios");
const fs = require("fs");
const OpenAI = require("openai");
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

const mencionaAlgumaMarcaDaLoja = (entrada) => {
  const termos = ["redmi", "realme", "poco", "note"];
  const texto = entrada.toLowerCase();
  return termos.some(t => texto.includes(t));
};

const agenteDeDemonstracaoPorBoleto = async ({ sender, msgContent, pushName }) => {
  const nome = await getNomeUsuario(sender);
  try {
    const entradaAtual = typeof msgContent === "string" ? msgContent : msgContent?.termosRelacionados || "";
    await appendToConversation(sender, entradaAtual);

    const conversaArray = await getConversation(sender);
    const conversaCompleta = conversaArray.map(f => f.replace(/^again\s*/i, "").trim()).slice(-10).join(" | ");

    const listaParaPrompt = await obterModelosDoBling();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `🤖 Você é Anna, assistente virtual da Vertex Store.

Seu objetivo é identificar e apresentar ao cliente UM modelo exato de smartphone com base apenas na lista de modelos disponíveis abaixo. Use o histórico completo da conversa e a intenção do cliente para tomar decisões.

══════════ FUNÇÕES DISPONÍVEIS ══════════
• demonstrarCelular({ "modeloMencionado": "NOME_EXATO" })
• investigarMais({ "pergunta": "TEXTO" })

══════════ COMO DECIDIR ══════════

1. MATCH FINAL
• Leia o histórico completo da conversa do cliente (mesmo que ele tenha escrito com erros, abreviações ou em etapas).
• Se houver UM modelo exato que combina claramente com o que o cliente quer,
→ chame demonstrarCelular com o nome exato do modelo da lista.

2. MÚLTIPLOS CANDIDATOS DE MESMA LINHA
• Se o cliente mencionar apenas o nome-base de um celular (ex: "REALME C61", "POCO X7", "NOTE 14"),
→ verifique se há múltiplas versões desse modelo (ex: variações de RAM, armazenamento ou conectividade como 4G/5G).

→ Mostre TODAS as versões desse modelo base ao cliente, mesmo que os nomes sejam parecidos.
→ Use a função investigarMais com esses modelos organizados individualmente, cada um com nome, preço, imagem e descrição.

⚠️ Exemplo prático:
Cliente escreveu: "tô vendo um realme c61"
→ Modelos disponíveis:
- REALME C61 256GB 6GB RAM
- REALME C61 256GB 8GB RAM

→ Resposta correta:
investigarMais com os dois modelos listados individualmente.

3. SEM MATCH
• Se não houver nenhum modelo que combine com o histórico da conversa,
→ chame investigarMais pedindo mais detalhes, ex: “Pode repetir o nome do modelo?”

══════════ REGRAS IMPORTANTES ══════════
• Nunca invente nomes de celulares que não estejam na lista.
• Use apenas os modelos reais da lista fornecida.
• Nunca escreva mensagens fora das chamadas de função.

══════════ CONTEXTO DO CLIENTE ══════════
Histórico da conversa:
${conversaCompleta}

📦 Modelos disponíveis:
${listaParaPrompt.map(m => `- ${m.nome} (R$ ${m.preco})`).join("\n")}
`
        },
        { role: "user", content: entradaAtual }
      ],
      functions,
      function_call: "auto"
    });

    const toolCall = completion.choices[0]?.message?.function_call;

    if (toolCall) {
      const { name, arguments: argsStr } = toolCall;
      const args = argsStr ? JSON.parse(argsStr) : {};

      const normalizeString = (str) => str.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/gi, '').trim();

      // Corrigir chamadas incorretas da IA (termosRelacionados ao invés de modeloMencionado)
if (name === "demonstrarCelular" && args?.termosRelacionados && !args?.modeloMencionado) {
  args.modeloMencionado = args.termosRelacionados;
  delete args.termosRelacionados;
}     

      if (handlers[name]) {
        return await handlers[name](sender, args, { msgContent });
      }
    }

    // 🚫 Aqui entra a verificação ANTES dos embeddings
    if (!mencionaAlgumaMarcaDaLoja(entradaAtual)) {
      return await sendBotMessage(sender, "Esse modelo não está disponível no nosso catálogo. Hoje trabalhamos apenas com *Redmi*, *Realme* e *Poco* 💜.");
    }

    const similaridades = await calcularSimilaridadePorEmbeddings(entradaAtual, listaParaPrompt);
    const [top1, top2, top3, top4] = similaridades;

    if (top1?.score > 0.95) {
      return await handlers.demonstrarCelular(sender, { modeloMencionado: top1.modelo }, { msgContent });
    } else if (top1 && top2 && top3 && top4) {
      const modelosEstruturados = [top1, top2, top3].map(m => ({
        nome: m.modelo,
        preco: m.preco,
        descricaoCurta: m.descricaoCurta,
        imagemURL: m.imagemURL,
        subTitulo: m.subTitulo,
        fraseImpacto: m.fraseImpacto,
        precoParcelado: m.precoParcelado
      }));

      return await handlers.investigarMais(sender, {
        modelos: modelosEstruturados
      });
    } else {
      return await handlers.investigarMais(sender, {
        pergunta: `Então ${nome}, infelizmente não estamos trabalhando com esse modelo no momento, mas temos Redmi, Realme, Poco. Qual desses você tem interesse?`
      });
    }
  } catch (error) {
    console.error("Erro em identificarModeloPorNome:", error);
    return await sendBotMessage(sender, "⚠️ Erro ao identificar o modelo. Pode tentar de novo?");
  }
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
    return await agenteDeDemonstracaoPorNomePorBoleto({
      sender,
      msgContent: extras.msgContent,
      modeloMencionado: args.modeloMencionado,
    });
  },
  investigarMais: async (sender, args) => {
    await setUserStage(sender, "agente_de_demonstracao_pos_decisao_por_boleto");   

    const listaCompleta = await obterModelosDoBling();
    const modelosExibidos = new Set();

    if (!Array.isArray(args.modelos)) {
      console.warn("⚠️ IA não enviou modelos estruturados. Convertendo string para blocos individuais.");
      const blocos = (args.pergunta || "").split("🔥").map(m => m.trim()).filter(Boolean);
    
      let encontrouModeloRelacionado = false;
    
      for (const bloco of blocos) {
        const nomeBlocoNormalizado = bloco.toLowerCase().replace(/[^a-z0-9]/gi, ' ').trim();
    
        const modelosRelacionados = listaCompleta.filter(m => {
          const nomeModeloNormalizado = m.nome.toLowerCase().replace(/[^a-z0-9]/gi, ' ').trim();
          return nomeModeloNormalizado.includes(nomeBlocoNormalizado);
        });
    
        if (modelosRelacionados.length > 0) {
          encontrouModeloRelacionado = true;
    
          for (const modeloRelacionado of modelosRelacionados) {
            const nomeModeloKey = modeloRelacionado.nome.toLowerCase().replace(/[^a-z0-9]/gi, ' ').trim();
            if (modelosExibidos.has(nomeModeloKey)) continue;
    
            modelosExibidos.add(nomeModeloKey);
    
            const textoFormatado = formatarDescricaoParaCaption(modeloRelacionado);
    
            await sendBotMessage(sender, {
              imageUrl: modeloRelacionado.imagemURL,
              caption: textoFormatado
            });
    
            await appendToConversation(sender, `modelo_sugerido: ${modelo.nome}`);
          }
        }
      }
    
      // Se não encontrou nenhum modelo relacionado em nenhum bloco → mostra todos os modelos da lista
      if (!encontrouModeloRelacionado) {
        console.log("⚠️ Nenhum modelo reconhecido. Mostrando todos os modelos disponíveis.");
        const todosModelos = listaCompleta.slice(0, 6); // Limite se necessário
    
        for (const modelo of todosModelos) {
          const nomeModeloKey = modelo.nome.toLowerCase().replace(/[^a-z0-9]/gi, ' ').trim();
          if (modelosExibidos.has(nomeModeloKey)) continue;
    
          modelosExibidos.add(nomeModeloKey);
    
          const textoFormatado = formatarDescricaoParaCaption(modelo);
    
          await sendBotMessage(sender, {
            imageUrl: modelo.imagemURL,
            caption: textoFormatado
          });
    
          await appendToConversation(sender, `modelo_sugerido: ${modelo.nome}`);
        }
      }
    }
    
    
    if (!args.modelos) args.modelos = [];

    let modelosParaExibir;
    const ehListaDeNomes = args.modelos.every(m => typeof m === "string");

    if (ehListaDeNomes) {
      modelosParaExibir = args.modelos.map(nomeIA => {
        return listaCompleta.find(modelo =>
          modelo.nome.toLowerCase().replace(/\s+/g, ' ').trim() === nomeIA.toLowerCase().replace(/\s+/g, ' ').trim()
        );
      }).filter(Boolean);
    } else {
      modelosParaExibir = args.modelos.map(objIA => {
        const nomeNormalizado = objIA.nome?.toLowerCase().replace(/\s+/g, ' ').trim();
        const modeloCompleto = listaCompleta.find(m =>
          m.nome.toLowerCase().replace(/\s+/g, ' ').trim() === nomeNormalizado
        );

        return modeloCompleto ? {
          ...objIA,
          imagemURL: modeloCompleto.imagemURL,
          descricaoCurta: modeloCompleto.descricaoCurta,
          preco: modeloCompleto.preco,
          precoParcelado: modeloCompleto.precoParcelado,
          fraseImpacto: modeloCompleto.fraseImpacto,
          subTitulo: modeloCompleto.subTitulo
        } : null;
        
      }).filter(Boolean);
    }

    for (const modelo of modelosParaExibir) {
      const nomeModeloKey = modelo.nome.toLowerCase().replace(/[^a-z0-9]/gi, ' ').trim();
      if (modelosExibidos.has(nomeModeloKey)) continue;
      modelosExibidos.add(nomeModeloKey);

      const textoFormatado = formatarDescricaoParaCaption(modelo);

      await sendBotMessage(sender, {
        imageUrl: modelo.imagemURL,
        caption: textoFormatado
      });

      await appendToConversation(sender, `modelo_sugerido: ${modelo.nome}`);
    }
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    await delay(2000);   
     
    await sendBotMessage(sender, "➡️ *Desses, qual mais te chamou atenção?*");

    await appendToConversation(sender, `sugestao_modelo_investigar: ${Array.from(modelosExibidos).join(", ")}`);
  }    
};

const functions = [
  {
    name: "demonstrarCelular",
    description: "Chama a função para mostrar o modelo exato ao usuário.",
    parameters: {
      type: "object",
      properties: {
        modeloMencionado: { type: "string", description: "Nome exato do modelo encontrado." }
      },
      required: ["modeloMencionado"]
    }
  },
  {
    name: "investigarMais",
    description: "Sugere uma lista de modelos para o cliente avaliar.",
    parameters: {
      type: "object",
      properties: {
        modelos: {
          type: "array",
          description: "Lista dos modelos que devem ser apresentados para o cliente.",
          items: {
            type: "object",
            properties: {
              nome: { type: "string" },
              preco: { type: "number" },
              memoriaRam: { type: "string" },
              armazenamento: { type: "string" },
              descricaoCurta: { type: "string" },
              imagemURL: { type: "string" }
            },
            required: ["nome", "preco"]
          }
        }
      },
      required: ["modelos"]
    }
  }
];

module.exports = { agenteDeDemonstracaoPorBoleto };