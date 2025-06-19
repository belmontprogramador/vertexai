// 🔄 Agente GPT completo com lógica igual a identificarModeloPorNome
const { sendBotMessage } = require("../../messageSender");
const {
  setUserStage,
  appendToConversation,
  getConversation,
  getNomeUsuario,
  getUserStage,
} = require("../../redisService");
const { getAllCelulareBoleto } = require("../../dbService");
const { rotinaDeAgendamento } = require("../../GerenciadorDeRotinas/GerenciadorDeAgendamento/rotinaDeAgendamento");
const OpenAI = require("openai");
require("dotenv").config();
const { objeçõesVertexBoleto } = require("../../../Services/utils/objecoesBoleto");
const { informacoesPayjoy } = require("../../../Services/utils/informacoesPayjoy");
const { gatilhosEmocionaisVertex } = require('../../../Services/utils/gatilhosEmocionais'); 
const { intencaoDataEntregaDesconto } = require('../../../Services/utils/intencaoDataEntregaDesconto');
const { tomDeVozVertexData } = require("../../../Services/utils/tomDeVozVertexData");
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

const agenteDeDemonstracaoDetalhadaBoleto = async ({ sender, msgContent, pushName }) => {
  try {
    await setUserStage(sender, "agente_de_demonstracao_pos_decisao_por_boleto")
    const nome = await getNomeUsuario(sender);
    const textoQuoted = extrairTextoDoQuotedMessage(msgContent);

    let entrada = typeof msgContent === "string" ? msgContent : msgContent?.termosRelacionados || "";
    if ((!entrada || entrada.toLowerCase().includes("esse")) && textoQuoted) {
      entrada = textoQuoted;
    }

    entrada = entrada.trim().replace(/^again\s*/i, "") || "o cliente marcou uma mensagem mas não escreveu nada";
    await appendToConversation(sender, entrada);
    console.log("📜 Histórico completo (raw):", conversa);

    const conversa = await getConversation(sender);
    const conversaCompleta = conversa.slice(-10).join(" | ");
    const modelosRecentes = conversa
      .filter(m => m.startsWith("modelo_sugerido_json:") || m.startsWith("modelo_sugerido:"))
      .map(m => {
        try {
          return m.startsWith("modelo_sugerido_json:")
            ? JSON.parse(m.replace("modelo_sugerido_json: ", ""))
            : { nome: m.replace("modelo_sugerido: ", ""), descricaoCurta: "(descrição não disponível)", preco: "preço não informado" };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
      console.log("📦 Modelos recentes identificados no histórico:", modelosRecentes);

    const listaParaPrompt = await obterModelosDoBling();
    const similaridades = await calcularSimilaridadePorEmbeddings(entrada, listaParaPrompt);
    console.log("🧠 Similaridades calculadas:", similaridades.map(s => ({ nome: s.nome, score: s.score })));
    const modeloEscolhido = similaridades?.[0];

    const deliberarPossibilidades = async () => {
      const prompt = `
Cliente enviou: "${entrada}"
MODELOS MOSTRADOS:
${modelosRecentes.map(m => `- ${m.nome}`).join("\n") || "(nenhum modelo mostrado ainda)"}

💡 Quais são as 3 possibilidades mais prováveis que o cliente quer com essa mensagem?
1. Se — e SOMENTE SE — o cliente disser explicitamente frases como "fechou", "quero esse", "vamos fechar", "é esse mesmo", "bora", "fechado", ou mencionar uma data exata de fechamento como "vou hoje", "passo aí amanhã", "mês que vem", então ele está confirmando um dos modelos sugeridos. Escolha "fecharVenda".

2. Se o cliente fizer QUALQUER pergunta mesmo sem usar ponto de ? — mesmo curta — como "é bom?", "e esse?", "a câmera é boa?", "qual o preço?", ou mostrar dúvida sobre qualquer aspecto, isso deve ser interpretado como que ele ainda está indeciso e precisa de mais informações. Escolha "responderDuvida".

3. Se ele mencionar um modelo, é "mostrarResumoModeloBoleto".

Retorne em formato JSON:
{
  possibilidades: [
    { acao: "", motivo: "" }
  ]
}`;
      const resp = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9
      });

      const raw = resp.choices?.[0]?.message?.content || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("❌ Nenhum JSON válido encontrado na resposta:", raw);
        return null;
      }

      return JSON.parse(jsonMatch[0]);
    };

    const avaliarMelhorCaminho = (possibilidades, extras) => {
      const { msgContent = "", quotedMessage = "" } = extras || {};
      const texto = `${msgContent} ${quotedMessage}`.toLowerCase();
      if (!possibilidades?.possibilidades || possibilidades.possibilidades.length === 0) {
        return "responderDuvida";
      }
      return possibilidades.possibilidades[0].acao;
    };

    const resultadoTOA = await deliberarPossibilidades();
    const acaoEscolhida = avaliarMelhorCaminho(resultadoTOA, { msgContent, quotedMessage: textoQuoted });

    console.log("🎯 Resultado TOA:", JSON.stringify(resultadoTOA, null, 2));

    if (handlers[acaoEscolhida]) {
      return await handlers[acaoEscolhida](sender, {}, {
        modeloEscolhido,
        msgContent: entrada,
        pushName,
        conversaCompleta
      });
    }

    return await sendBotMessage(sender, "⚠️ Não entendi sua escolha. Pode repetir?");
  } catch (error) {
    console.error("❌ Erro no agenteDeDemonstracaoDetalhadaBoleto:", error);
    return await sendBotMessage(sender, "⚠️ Ocorreu um erro. Pode tentar de novo?");
  }
};


const handlers = {
  fecharVenda: async (sender, _args, extras) => {
    const { modeloEscolhido, pushName, msgContent } = extras;
    return await rotinaDeAgendamento({ sender, msgContent, pushName });
  },
  mostrarResumoModeloBoleto: async (sender, args, extras) => {
    await setUserStage(sender, "agente_de_demonstracao_pos_decisao_por_boleto")
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
    
      if (!modelo) {
        await sendBotMessage(sender, `Opa ${nome} acho que a gente conversou sobre mais de um modelo e fiquei na duvida qual você escolheu`)
        return await sendBotMessage(sender, "Pode me dizer qual o modelo exato que você escolheu?" );
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
          content: `Modelo: ${modelo.nome}\nFrase de impacto: ${modelo.fraseImpacto}\nDescrição curta: ${modelo.descricaoCurta}`
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
      
   // Salva no histórico
   await appendToConversation(sender, `modelo_sugerido_json: ${JSON.stringify(modelo)}`);
  
      // Envia o vídeo com o mesmo resumo como legenda
      if (modelo.videoURL) {
        await sendBotMessage(sender, {
          videoUrl: modelo.videoURL,
          caption: resumo
        });
      }
     
    },
  responderDuvida: async (sender, _args, extras) => {
    await setUserStage(sender, "agente_de_demonstração_detalhada_boleto");
    await sendBotMessage(sender,"reposnder duvida")
  
    const historico = await getConversation(sender);
    const conversaCompleta = historico.map(f => f.replace(/^again\s*/i, "").trim()).slice(-10).join(" | ");
    const modelosBanco = await getAllCelulareBoleto();
    const nome = await getNomeUsuario(sender);
  
    const nomesHistorico = historico
      .filter(m => m.startsWith("modelo_sugerido_json:") || m.startsWith("modelo_sugerido:"))
      .map(m => {
        if (m.startsWith("modelo_sugerido_json:")) {
          try {
            const obj = JSON.parse(m.replace("modelo_sugerido_json:", ""));
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
  ${JSON.stringify(objeçõesVertexBoleto, null, 2).slice(0, 3000)}
  
  GATILHOS EMOCIONAIS:
  ${JSON.stringify(gatilhosEmocionaisVertex, null, 2)}

     OBJEÇÕES SOBRE PAYJOY:
    ${JSON.stringify(informacoesPayjoy).slice(0, 3500)}

  TOM DE DESCONTOS ENTREGA E LOJA
  ${JSON.stringify(intencaoDataEntregaDesconto, null, 2)}
  `;
  
    const prompt = `
  ## OBJETIVO
  Guiar o cliente até escolher um smartphone da lista apresentada e fechar a venda,
  sempre valorizando experiência, suporte humanizado e diferencial da loja.
  utilize um tom de voz formal
  Sua missão é extrair do cliente uma data para fazer uma visita a loja
  
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
  - Descontos: não oferecemos desconto no boleto.
  - Parcelamento padrão 18×.
  - Use analogias para comparar serviços (ex.: “comprar só preço é como…”).
  
  ## REGRAS_DE_ESTILO
  - Nunca comece resposta com saudação completa; a conversa já está em andamento.
  - Seja conciso e humanizado; máximo 3 blocos (“emoção”, “benefício”, “call-to-action”).
  - Sempre feche perguntando algo que avance (ex.: “vamos agendar sua visita”, "quando voce pode vir a loja").
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
      temperature: 1,
      max_tokens: 300
    });
    
    const escolha = respostaIA.choices[0]?.message;
    
    // Caso a IA apenas responda diretamente
    const respostaFinal = escolha?.content?.trim();
    if (!respostaFinal) {
      return await sendBotMessage(sender, "📌 Estou verificando... Pode repetir a dúvida de forma diferente?");
    }
    
    return await sendBotMessage(sender, respostaFinal);
   
}
}

 
module.exports = {
  agenteDeDemonstracaoDetalhadaBoleto,
  handlers
  
};

