// 🔄 Agente GPT completo com lógica igual a identificarModeloPorNome
const { sendBotMessage } = require("../../messageSender");
const {
  setUserStage,
  appendToConversation,
  getConversation,
  getNomeUsuario,
  getUserStage,
} = require("../../redisService");
const { getAllCelulares } = require("../../dbService");
const { rotinaDeAgendamento } = require("../../GerenciadorDeRotinas/GerenciadorDeAgendamento/rotinaDeAgendamento");
const OpenAI = require("openai");
require("dotenv").config();
const { objeçõesVertex } = require("../../../Services/utils/objecoes");
const { gatilhosEmocionaisVertex } = require('../../../Services/utils/gatilhosEmocionais');
const { tomDeVozVertex } = require('../../../Services/utils/tomDeVozVertex');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const obterModelosDoBling = async () => {
  const celulares = await getAllCelulares();

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

const agenteDeDemonstracaoDetalhada = async ({ sender, msgContent }) => {
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
          content: `Você é Anna. Seu trabalho é apresentar UM modelo de celular ao cliente com base na lista abaixo. Se identificar o modelo, use mostrarResumoModelo. Se o cliente quiser agendar, use fecharVenda.\n\nHistórico:\n${conversaCompleta}\n\nModelos disponíveis:\n${listaParaPrompt.map(m => `- ${m.nome}`).join("\n")}`
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
      if (handlers[name]) {
        const similaridades = await calcularSimilaridadePorEmbeddings(entradaAtual, listaParaPrompt);
        const modeloEscolhido = similaridades[0];
        return await handlers[name](sender, args, { modeloEscolhido, msgContent });
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
    await sendBotMessage(sender, `🎯 Perfeito! Vamos agendar agora sua visita para garantir seu ${modeloEscolhido.nome}.`);
    return await rotinaDeAgendamento({ sender, msgContent, pushName });
  },
  mostrarResumoModelo: async (sender, args, extras) => {
    let modelo = extras?.modeloEscolhido;
    const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ').trim();
    if (!modelo && args?.nomeModelo) {
      const lista = await obterModelosDoBling();
      modelo = lista.find(m => normalize(m.nome) === normalize(args.nomeModelo));
    }
    if (!modelo || !modelo.preco) {
      return await sendBotMessage(sender, "❌ Não consegui identificar esse modelo. Pode tentar novamente?");
    }
    if (modelo.videoURL) {
      await sendBotMessage(sender, {
        videoUrl: modelo.videoURL,
        caption: `📱 Modelo reconhecido: *${modelo.nome}*`
      });
    }
    await sendBotMessage(sender, `🔥 *${modelo.nome}* – ${modelo.fraseImpacto}\n\n${modelo.descricaoCurta}\n\n💰 *Preço à vista:* R$ ${modelo.preco.toFixed(2)}\n\n👉 Quer agendar uma visita pra garantir o seu?`);
  },
  responderDuvida: async (sender, _args, extras) => {
    await setUserStage(sender, "agente_de_demonstração_detalhada");

    const historico = await getConversation(sender);
    const conversaCompleta = historico.map(f => f.replace(/^again\s*/i, "").trim()).slice(-10).join(" | ");
  
    // Carrega todos os modelos disponíveis do banco (com descrição completa)
    const modelosBanco = await getAllCelulares();

    const nome = await getNomeUsuario(sender);
  
    // Extrai nomes do histórico (modelo_sugerido_json ou modelo_sugerido)
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
  
    // Filtra os modelos do banco que estão no histórico
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
    ${JSON.stringify(tomDeVozVertex, null, 2)}
    
    OBJEÇÕES COMUNS:
    ${JSON.stringify(objeçõesVertex, null, 2).slice(0, 3000)}
    
    GATILHOS EMOCIONAIS:
    ${JSON.stringify(gatilhosEmocionaisVertex, null, 2)}
    `;
    
    const prompt = `
   ##  OBJETIVO
Guiar o cliente até escolher um smartphone da lista apresentada e fechar a venda,
sempre valorizando experiência, suporte humanizado e diferencial da loja.

##  TOM_DE_VOZ (tomDeVozVertex)
- Saudação acolhedora porém direta.
- Use vocativo informal respeitoso (ex.: “Perfeito, Felipe!”).
- Emojis: 💜 obrigatório + 1 contextual; use 🔥 para descontos.
- Até 250 caracteres por bloco; quebre linhas por assunto.
- Pontuação dupla (“!!”, “…” ) permitida.

##  GATILHOS_EMOCIONAIS (gatilhosEmocionaisVertex)
- Priorize Segurança ➜ Rapidez ➜ Transferência de dados na hora.
- Explore “Garantia empática”, “Telefone reserva”, “Loja física confiável”.
- Conecte benefícios à vida diária (produtividade, memórias, status).

##  OBJECÇÕES & COMPARATIVOS (objeçõesVertex)
- Se cliente comparar preço online → explique valor agregado (lista de diferenciais).
- Descontos: só R$ 100 à vista, ofereça **após** defender valor.
- Parcelamento padrão 10×; ofereça 12× **apenas se insistir** muito.
- Use analogias para comparar serviços (ex.: “comprar só preço é como…”).

##  REGRAS_DE_ESTILO
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
    
    💰 Preços (para cálculo de desconto):
    ${modelos.map(m => `• ${m.nome}: R$ ${m.preco.toFixed(2)}`).join("\n")}

    Nome do usuario
    ${nome}
    `;   
  
    const respostaIA = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: contexto },  // ✅ system primeiro
        { role: "user", content: prompt }
      ],
      temperature: 1.0,
      max_tokens: 150
    });
  
    const respostaFinal = respostaIA.choices[0]?.message?.content?.trim();
  
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
  agenteDeDemonstracaoDetalhada
  
};

