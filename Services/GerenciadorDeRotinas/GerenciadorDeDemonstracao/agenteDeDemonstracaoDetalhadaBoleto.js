// 🔄 Agente GPT completo com lógica igual a identificarModeloPorNome
const { sendBotMessage } = require("../../messageSender");
const {
  setUserStage,
  appendToConversation,
  getConversation,
  getNomeUsuario,
  getUserStage,
} = require("../../redisService");
const {getAllCelulareBoleto } = require("../../dbService");
const { rotinaDeAgendamento } = require("../../GerenciadorDeRotinas/GerenciadorDeAgendamento/rotinaDeAgendamento");
const OpenAI = require("openai");
require("dotenv").config();
const { objeçõesVertex } = require("../../../Services/utils/objecoes");
const { gatilhosEmocionaisVertex } = require('../../../Services/utils/gatilhosEmocionais'); 
const { intencaoDataEntregaDesconto } = require('../../../Services/utils/intencaoDataEntregaDesconto');
const { tomDeVozVertexData } = require("../../utils/tomDeVozVertexData");
const { extrairTextoDoQuotedMessage } = require("../../utils/extrairTextoDoQuotedMessage");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const obterModelosDoBling = async () => {
  const celulares = await getAllCelulareBoleto();

  const termosIgnorados = [
    "BLACK", "WHITE", "BLUE", "GREEN", "GOLD", "PURPLE", "SILVER", "CORAL",
    "MIDNIGHT", "OCEAN", "TEAL", "AZUL", "VERDE", "LAVENDER", "VOYAGE",
    "MARBLE", "STORM", "LIGHTNING", "SPARKLE", "DARK", "LIME", "STAR", "STARRY",
    "OCÉANO", "ROM", "RAM"
  ];

  const normalizeNome = (nome) =>
    nome
      .replace(/^smartphone\s*/i, "")
      .replace(/[^\w\s]/gi, "")
      .trim()
      .split(/\s+/)
      .filter((p) => !termosIgnorados.includes(p.toUpperCase()))
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
        descricaoCurta: c.descricao, // ✅ Corrigido aqui!
        imagemURL: c.imageURL,
        precoParcelado: c.precoParcelado,
        fraseImpacto: c.fraseImpacto,
        subTitulo: c.subTitulo,
        videoURL: c.videoURL,
      });
    }
  }

  return Array.from(mapaUnico.values());
};


const calcularSimilaridadePorEmbeddings = async (entrada, modelos) => {
  const entradaEmbedding = await openai.embeddings.create({ model: "text-embedding-3-small", input: entrada });
  const modelosEmbedding = await openai.embeddings.create({ model: "text-embedding-3-small", input: modelos.map(m => m.nome) });
  const vetorEntrada = entradaEmbedding.data[0].embedding;
  return modelosEmbedding.data.map((item, i) => {
    const m = modelos[i];
    const score = vetorEntrada.reduce((acc, val, idx) => acc + val * item.embedding[idx], 0);
    return { ...m, score };
  }).sort((a, b) => b.score - a.score);
};

const formatarDescricaoParaCaption = (modelo) => (
  `🔥 *${modelo.nome}*🔥\n\n${modelo.subTitulo}\n\n${modelo.descricaoCurta}\n\n💰📦 ${modelo.precoParcelado}\n\n${modelo.fraseImpacto}\n\n💵 Preço: R$ ${modelo.preco?.toFixed(2)}`
    .replace(/\u00A0/g, ' ').replace(/\u200B/g, '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
);

const agenteDeDemonstracaoDetalhadaBoleto = async ({ sender, msgContent }) => {
  const nome = await getNomeUsuario(sender);
  try {
    // 🧠 Captura a mensagem citada, se houver
    const textoQuoted = extrairTextoDoQuotedMessage(msgContent);

    // 🔤 Normaliza a entrada atual
    let entradaAtual = typeof msgContent === "string" ? msgContent : msgContent?.termosRelacionados || "";

    // 🧩 Substitui por mensagem citada se for vaga ou indicar "esse"
    if ((!entradaAtual || entradaAtual.toLowerCase().includes("esse")) && textoQuoted) {
      entradaAtual = textoQuoted;
    }

    await appendToConversation(sender, entradaAtual);
    const conversaArray = await getConversation(sender);
    const conversaCompleta = conversaArray.map(f => f.replace(/^again\s*/i, "").trim()).slice(-10).join(" | ");
    const listaParaPrompt = await obterModelosDoBling();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
    Você é Anna, especialista da Vertex Store.
    
    Seu papel é: 
    - Sempre sempre Mostrar primeiro o resumo e vídeo de UM modelo se o cliente demonstrar interesse direto antes de fechar a venda.
    - Tirar dúvidas se ele fizer perguntas específicas (como "a bateria é boa?").
    - Fechar a venda se ele demonstrar intenção clara de compra.
    
    ══════════ CONTEXTO DO CLIENTE ══════════
    📜 Histórico:
    ${conversaCompleta}
    
    📦 Modelos disponíveis:
    ${listaParaPrompt.map(m => `- ${m.nome}`).join("\n")}
    
    Lembre-se:
    • Só use funções.
    • Não repita um resumo se o cliente estiver fazendo uma pergunta.
    • Sempre prefira tirar dúvida se houver incerteza antes de fechar.
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
  const similaridades = await calcularSimilaridadePorEmbeddings(entradaAtual, listaParaPrompt);
  const modeloEscolhido = similaridades[0];

  if (handlers[name]) {
    return await handlers[name](sender, args, {
      modeloEscolhido,
      msgContent,
      pushName: nome // ou undefined se pushName não for passado aqui
    });
  }
}

    

    const similaridades = await calcularSimilaridadePorEmbeddings(entradaAtual, listaParaPrompt);
    const modeloEscolhido = similaridades[0];
    if (modeloEscolhido?.score > 0.9) {
      return await handlers.mostrarResumoModelo(sender, { nomeModelo: modeloEscolhido.nome }, { modeloEscolhido });
    }
    await sendBotMessage(sender, `Não consegui identificar o modelo com clareza. Pode repetir o nome por favor?`);
  } catch (err) {
    console.error("Erro no agenteDeDemonstracaoDetalhada:", err);
    await sendBotMessage(sender, `⚠️ Erro ao analisar o modelo. Pode tentar de novo?`);
  }
};

const handlers = {
  fecharVenda: async (sender, args, extras) => {
    const { modeloEscolhido, pushName, msgContent } = extras;
    return await rotinaDeAgendamento({ sender, msgContent, pushName });
  },
  mostrarResumoModelo: async (sender, args, extras) => {
    let modelo = extras?.modeloEscolhido;
    const nome = await getNomeUsuario(sender);
  
    const normalize = (str) =>
      str.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/gi, "")
        .replace(/\s+/g, " ")
        .trim();
  
    if (!modelo && args?.nomeModelo) {
      const lista = await obterModelosDoBling();
      modelo = lista.find(m => normalize(m.nome) === normalize(args.nomeModelo));
    }
  
    if (!modelo || !modelo.preco) {
      return await sendBotMessage(sender, "❌ Não consegui identificar esse modelo. Pode tentar novamente?");
    }
  
    // Geração do resumo via GPT
    const prompt = [
      {
        role: "system",
        content: `Você é um vendedor persuasivo e direto. 
        Seja direto, com no máximo 3 frases curtas. Priorize clareza e impacto, não ultrapasse 250 caracteres no total.

        ***Faça o mais resumido possivel para usar o token e não faltar mensagem***
        Use uma linguagem formal mas descontraida.
        pule semre uma linha entre o resumo e a mensagem do tom de voz
        de preferencia ao preço parcelado
        Nome do cliente ${nome}
        Ao final sempre faça perguntas utilizando esse documento como base:
        TOM DE VOZ:
        ${JSON.stringify(tomDeVozVertexData, null, 2)}
        
        `
      },
      {
        role: "user",
        content: `Modelo: ${modelo.nome}\nFrase de impacto: ${modelo.fraseImpacto}\nDescrição curta: ${modelo.descricaoCurta}\nPreço à vista: R$ ${modelo.preco.toFixed(2)}`
      }
    ];
  
    let resumo = "";
    try {
      const resposta = await openai.chat.completions.create({
        model: "gpt-4",
        messages: prompt,
        temperature: 0.99,
        max_tokens: 150
      });
  
      resumo = resposta.choices?.[0]?.message?.content?.trim() || "";
    } catch (err) {
      console.error("Erro ao gerar resumo com GPT:", err);
      resumo = `📱 *${modelo.nome}*\n${modelo.fraseImpacto}\n💰 R$ ${modelo.preco.toFixed(2)}\n\nEm breve te explico mais!`;
    }  
    
  
    // Envia o vídeo com o mesmo resumo como legenda
    if (modelo.videoURL) {
      await sendBotMessage(sender, {
        videoUrl: modelo.videoURL,
        caption: resumo
      });
    }
    
  
    // Salva no histórico
    await appendToConversation(sender, `modelo_sugerido_json: ${JSON.stringify(modelo)}`);
  },
  responderDuvida: async (sender, _args, extras) => {
    await setUserStage(sender, "agente_de_demonstração_detalhada_boleto");
  
    const historico = await getConversation(sender);
    const conversaCompleta = historico.map(f => f.replace(/^again\s*/i, "").trim()).slice(-10).join(" | ");
    const modelosBanco = await getAllCelulareBoleto();
    const nome = await getNomeUsuario(sender);
  
    const nomesHistorico = historico
      .filter(m => m.startsWith("modelo_sugerido_json:") || m.startsWith("modelo_sugerido:"))
      .map(m => {
        if (m.startsWith("modelo_sugerido_json:")) {
          try {
            const obj = JSON.parse(m.replace("modelo_sugerido_json: ", ""));
            return obj.nome;
          } catch {
            return null;
          }
        }
        return m.replace("modelo_sugerido: ", "").trim();
      })
      .filter(Boolean);
  
    const modelos = modelosBanco.filter(m =>
      nomesHistorico.some(n => n.toLowerCase() === m.nome.toLowerCase())
    );
  
    if (modelos.length === 0) {
      return await sendBotMessage(sender, "⚠️ Ainda não te mostrei nenhum modelo pra comparar. Quer ver algumas opções?");
    }
  
    const contexto = `
  Você é Anna, especialista da Vertex Store.
  
  Siga exatamente as diretrizes abaixo para responder qualquer cliente:
  
  TOM DE VOZ:
  ${JSON.stringify(tomDeVozVertexData, null, 2)}
  
  OBJEÇÕES COMUNS:
  ${JSON.stringify(objeçõesVertex, null, 2).slice(0, 3000)}
  
  GATILHOS EMOCIONAIS:
  ${JSON.stringify(gatilhosEmocionaisVertex, null, 2)}

  TOM DE DESCONTOS ENTREGA E LOJA
  ${JSON.stringify(intencaoDataEntregaDesconto, null, 2)}
  `;
  
    const prompt = `
  ## OBJETIVO
  Guiar o cliente até escolher um smartphone da lista apresentada e fechar a venda,
  sempre valorizando experiência, suporte humanizado e diferencial da loja.
  utilize um tom de voz formal
  
  ## TOM_DE_VOZ (tomDeVozVertex)
  - Saudação acolhedora porém direta.
  - Use vocativo informal respeitoso (ex.: “Perfeito, Felipe!”).
  - Emojis: 💜 obrigatório + 1 contextual; use 🔥 para descontos.
  - Até 250 caracteres por bloco; quebre linhas por assunto.
  - Pontuação dupla (“!!”, “…” ) permitida.
  
  ## GATILHOS_EMOCIONAIS (gatilhosEmocionaisVertex)
  - Priorize Segurança ➜ Rapidez ➜ Transferência de dados na hora.
  - Explore “Garantia empática”, “Telefone reserva”, “Loja física confiável”.
  - Conecte benefícios à vida diária (produtividade, memórias, status).
  
  ## OBJEÇÕES & COMPARATIVOS (objeçõesVertex)
  - Se cliente comparar preço online → explique valor agregado.
  - Descontos: só R$ 100 à vista, ofereça **após** defender valor.
  - Parcelamento padrão 10×; ofereça 12× **apenas se insistir** muito.
  - Use analogias para comparar serviços (ex.: “comprar só preço é como…”).
  
  ## REGRAS_DE_ESTILO
  - Nunca comece resposta com saudação completa; a conversa já está em andamento.
  - Seja conciso e humanizado; máximo 3 blocos (“emoção”, “benefício”, “call-to-action”).
  - Sempre feche perguntando algo que avance (ex.: “Fecho em 10× pra você?”).
  ###############################
  
  📜 Histórico da conversa:
  ${conversaCompleta}
  
  📨 Última mensagem do cliente:
  "${extras.msgContent}"
  
  📱 Modelos apresentados:
  ${modelos.map(m => `➡️ *${m.nome}*\n${m.descricao}\n💵 Preço: R$ ${m.preco.toFixed(2)}`).join("\n")}
  
  💰 Preços:
  ${modelos.map(m => `• ${m.nome}: R$ ${m.preco.toFixed(2)}`).join("\n")}
  
  Nome do usuário:
  ${nome}
  `;
  
    // Chamada à IA com function calling
    const respostaIA = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: contexto },
        { role: "user", content: prompt }
      ],
      functions,
      function_call: "auto",
      temperature: 1,
      max_tokens: 300
    });
  
    const escolha = respostaIA.choices[0]?.message;
  
    // 🔁 Se a IA decidir por uma function_call
    if (escolha?.function_call) {
      const { name, arguments: argsStr } = escolha.function_call;
      const args = argsStr ? JSON.parse(argsStr) : {};
      const modeloEscolhido = modelos[0]; // pode ser o último demonstrado também
  
      if (handlers[name]) {
        return await handlers[name](sender, args, { ...extras, modeloEscolhido });
      }
    }
  
    // 🔄 Caso apenas queira continuar a conversa
    const respostaFinal = escolha?.content?.trim();
    if (!respostaFinal) {
      return await sendBotMessage(sender, "📌 Estou verificando... Pode repetir a dúvida de forma diferente?");
    }
  
    return await sendBotMessage(sender, respostaFinal);
  }
}

const functions = [
  {
    name: "fecharVenda",
    description: "Chama o agente de fechamento após o resumo e o video terem sido enviados e depois que o cliente quiser comprar ou agendar.",
    parameters: {
      type: "object",
      properties: {
        confirmacao: { type: "string", description: "Intenção de compra/agendamento" },
      },
      required: ["confirmacao"],
    },
  },
  {
    name: "mostrarResumoModelo",
    description: "Mostra o vídeo e o resumo formatado de um modelo específico reconhecido.",
    parameters: {
      type: "object",
      properties: {
        nomeModelo: { type: "string", description: "Nome exato do modelo reconhecido" }
      },
      required: ["nomeModelo"],
    },
  },
  {
    name: "responderDuvida",
    description: "Responde a uma dúvida específica do cliente sobre um ou mais modelos sugeridos anteriormente.",
    parameters: {
      type: "object",
      properties: {
        resposta: {
          type: "string",
          description: "Texto da resposta explicando diferenças, vantagens ou informações adicionais."
        }
      },
      required: ["resposta"]
    }
  },
];

 
module.exports = {
  agenteDeDemonstracaoDetalhadaBoleto
  
};

