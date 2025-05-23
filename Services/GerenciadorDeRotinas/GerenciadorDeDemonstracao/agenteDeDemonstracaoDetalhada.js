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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const obterModelosDoBling = async () => {
  const celulares = await getAllCelulares();
  const termosIgnorados = ["BLACK", "WHITE", "BLUE", "GREEN", "GOLD", "PURPLE", "SILVER", "CORAL", "MIDNIGHT", "OCEAN", "TEAL", "AZUL", "VERDE", "LAVENDER", "VOYAGE", "MARBLE", "STORM", "LIGHTNING", "SPARKLE", "DARK", "LIME", "STAR", "STARRY", "OCÉANO", "ROM", "RAM"];
  const normalizeNome = (nome) => nome.replace(/^smartphone\s*/i, "").replace(/[^\w\s]/gi, '').trim().split(/\s+/).filter(p => !termosIgnorados.includes(p.toUpperCase())).join(" ").toLowerCase().trim();
  const mapaUnico = new Map();
  for (const c of celulares) {
    const chave = normalizeNome(c.nome);
    if (!mapaUnico.has(chave)) {
      mapaUnico.set(chave, c);
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
  }
};

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
  }
];

 
module.exports = {
  agenteDeDemonstracaoDetalhada
  
};

