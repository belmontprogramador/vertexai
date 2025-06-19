const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,  
  getNomeUsuario,
  getUserStage
} = require("../../../redisService");
 
 
const { informacoesPayjoy } = require("../../../utils/informacoesPayjoy");
const { gatilhosEmocionaisVertex } = require('../../../utils/gatilhosEmocionais');
const { tomDeVozVertex } = require('../../../utils/tomDeVozVertex');
const { objeçõesVertexBoleto } = require("../../../utils/objecoesBoleto"); ;
const { handlers: handlersDemonstracaoDetalhadaBoleto, agenteDeDemonstracaoDetalhadaBoleto } = require("../../../GerenciadorDeRotinas/GerenciadorDeDemonstracao/agenteDeDemonstracaoDetalhadaBoleto");
const { appendToConversation, getConversation } = require("../../../HistoricoDeConversas/conversationManager");
const {getAllCelulareBoleto } = require('../../../dbService')

const OpenAI = require("openai");
const { agenteDeDemonstracaoPorNomePorBoleto } = require("./agenteDeDemonstracaoPorNomePorBoleto");
 
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const agenteDeDemonstracaoPosDecisaoPorBoleto = async ({ sender, msgContent, pushName, quotedMessage }) => {
  try {
    await setUserStage(sender, "agente_de_demonstracao_pos_decisao_por_boleto");

    // 🔍 Entrada sanitizada
    let entrada = typeof msgContent === "string" ? msgContent : msgContent?.termosRelacionados || "";
    if (quotedMessage) entrada += ` || Mensagem citada: ${quotedMessage}`;
    entrada = entrada.trim().replace(/^again\s*/i, "") || "o cliente marcou uma mensagem mas não escreveu nada";

    // 📝 Salva no histórico com JSON estruturado
    await appendToConversation(sender, JSON.stringify({
      tipo: "entrada_usuario",
      conteudo: entrada,
      timestamp: new Date().toISOString()
    }));

    const conversa = await getConversation(sender);

    // 🧠 Modelos recentes (JSON e prefixo antigo compatível)
    const modelosRecentes = conversa
    .map(msg => {
      try {
        const obj = typeof msg === "string" ? JSON.parse(msg) : msg;
  
        if (obj.tipo === "modelo_sugerido_json") return obj.conteudo;
        if (obj.tipo === "modelo_sugerido") {
          return typeof obj.conteudo === "string"
            ? { nome: obj.conteudo }
            : obj.conteudo;
        }
      } catch {
        if (typeof msg === "string" && msg.startsWith("modelo_sugerido: ")) {
          return { nome: msg.replace("modelo_sugerido: ", "") };
        }
      }
      return null;
    })
    .filter(Boolean);
  

    // 📜 Formato simples da conversa para prompt
    const conversaCompleta = conversa
      .map(msg => {
        try {
          const obj = JSON.parse(msg);
          return `[${obj.tipo}] ${obj.conteudo}`;
        } catch {
          return msg;
        }
      })
      .slice(-10)
      .join(" | ");

    // 🤖 Deliberação TOA
    const deliberarPossibilidades = async () => {
      const prompt = `
Cliente enviou: "${entrada}"
MODELOS MOSTRADOS:
${modelosRecentes.map(m => `- ${m.nome}`).join("\n") || "(nenhum modelo mostrado ainda)"}

💡 Quais são as 3 possibilidades mais prováveis que o cliente quer com essa mensagem?
1. Se — e SOMENTE SE — o cliente disser explicitamente frases como "fechou", "quero esse", "vamos fechar", "é esse mesmo", "bora", "fechado", ou mencionar uma data exata de fechamento como "vou hoje", "passo aí amanhã", "mês que vem", então ele está confirmando um dos modelos sugeridos. Escolha mostrarResumoModeloBoleto.

2. Se o cliente fizer QUALQUER pergunta mesmo sem usar ponto de ? — mesmo curta — como "é bom?", "e esse?", "a câmera é boa?", "qual o preço?", ou mostrar dúvida sobre qualquer aspecto, isso deve ser interpretado como que ele ainda está indeciso e precisa de mais informações. Escolha "responderDuvida".

3. Se ele mencionar um novo modelo, diferente dos listados, é "identificarModeloPorNome".

Retorne em formato JSON:
{
  "possibilidades": [
    { "acao": "", "motivo": "" }
  ]
}`;

      const resp = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9
      });

      const raw = resp.choices?.[0]?.message?.content || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      return JSON.parse(jsonMatch[0]);
    };

    // 🔍 Avaliação baseada nas possibilidades da IA
    const avaliarMelhorCaminho = (possibilidades) => {
      if (!possibilidades?.possibilidades || possibilidades.possibilidades.length === 0) {
        return "responderDuvida";
      }
      return possibilidades.possibilidades[0].acao;
    };

    const resultadoTOA = await deliberarPossibilidades();
    const acaoEscolhida = avaliarMelhorCaminho(resultadoTOA);
    console.log("🎯 Resultado TOA:", JSON.stringify(resultadoTOA, null, 2));

    // 🎬 Execução da ação
    if (handlers[acaoEscolhida]) {
      return await handlers[acaoEscolhida](sender, {}, {
        msgContent: entrada,
        quotedMessage,
        pushName,
        conversaCompleta
      });
    }

    return await sendBotMessage(sender, "⚠️ Não entendi sua escolha. Pode repetir?");
  } catch (error) {
    console.error("❌ Erro no agente TOA:", error);
    return await sendBotMessage(sender, "⚠️ Ocorreu um erro. Pode tentar de novo?");
  }
};

const handlers = {
  demonstracaoDetalhadaBoleto: async (sender, args, extras) => {
    await setUserStage(sender, "agente_de_demonstração_detalhada_boleto");
  
    const historico = await getConversation(sender);
  
    const modeloJaMostrado = historico.some((m) =>
      m.includes("modelo_sugerido_json") && m.includes(args.modeloMencionado)
    );
  
    if (!modeloJaMostrado && args?.modeloMencionado) {
      const modelos = await getAllCelulareBoleto();
      const modeloEscolhido = modelos.find(m =>
        m.nome.toLowerCase() === args.modeloMencionado.toLowerCase()
      );
  
      if (modeloEscolhido) {
        // ⚠️ Aqui você chama o outro handle
        await handlers.mostrarResumoModeloBoleto(sender, { nomeModelo: modeloEscolhido.nome }, { modeloEscolhido });

      }
    }
  
    // Continua com a demonstração detalhada
    return await agenteDeDemonstracaoDetalhadaBoleto({
      sender,
      msgContent: extras.msgContent,
      pushName: extras.pushName,
      modeloMencionado: args.modeloMencionado
    });
  },
  mostrarResumoModeloBoleto: handlersDemonstracaoDetalhadaBoleto.mostrarResumoModeloBoleto,
  responderDuvida: async (sender, _args, extras) => {
    await setUserStage(sender, "agente_de_demonstracao_pos_decisao_por_boleto");

    const { msgContent, quotedMessage } = extras;
 

    let entrada = typeof msgContent === "string" ? msgContent : msgContent?.termosRelacionados || "";

    // 🔍 Extrai o modelo da mensagem citada
    let modeloExtraido = null;
    if (quotedMessage) {
      const match = quotedMessage.match(/\*([^*]*(REALME|REDMI|POCO)[^*]*)\*/i);
      modeloExtraido = match?.[1]?.replace(/🔥/g, '').trim();
      console.log("🔎 Modelo extraído da quotedMessage:", modeloExtraido);
    }

    // 🧠 Substitui mensagens vagas pela citação
    if ((!entrada || /esse|modelo|aqui|isso/i.test(entrada)) && modeloExtraido) {
      entrada = modeloExtraido;
      console.log("📌 Entrada substituída pela citação:", entrada);
    }

    entrada = entrada.trim().replace(/^again\s*/i, "") || "o cliente marcou uma mensagem mas não escreveu nada";
    console.log("✏️ Entrada final:", entrada);

    await appendToConversation(sender, JSON.stringify({
      tipo: "entrada_usuario",
      conteudo: entrada,
      timestamp: new Date().toISOString()
    }));
    

    const historico = await getConversation(sender);
    const conversaCompleta = historico
  .map(f => {
    try {
      const obj = typeof f === "string" ? JSON.parse(f) : f;
      const texto = obj?.conteudo || "";
      return texto.replace(/^again\s*/i, "").trim();
    } catch {
      return typeof f === "string" ? f.trim() : "";
    }
  })
  .slice(-10)
  .join(" | ");


    const modelosBanco = await getAllCelulareBoleto();
    const nome = await getNomeUsuario(sender);

    const modelosRecentes = historico
  .map(msg => {
    try {
      const obj = typeof msg === "string" ? JSON.parse(msg) : msg;

      if (obj.tipo === "modelo_sugerido_json") return obj.conteudo;
      if (obj.tipo === "modelo_sugerido") {
        return typeof obj.conteudo === "string"
          ? { nome: obj.conteudo }
          : obj.conteudo;
      }
    } catch {
      if (typeof msg === "string" && msg.startsWith("modelo_sugerido: ")) {
        return { nome: msg.replace("modelo_sugerido: ", "") };
      }
    }
    return null;
  })
  .filter(Boolean);


    const mapaUnico = new Map();
    for (const modelo of modelosRecentes.reverse()) {
      const chave = modelo.nome.toLowerCase();
      if (!mapaUnico.has(chave)) {
        mapaUnico.set(chave, modelo);
      }
    }

    const modelos = Array.from(mapaUnico.values())
      .map(mJson => modelosBanco.find(m => m.nome.toLowerCase() === mJson.nome.toLowerCase()))
      .filter(Boolean);

    if (modelos.length === 0) {
      return await sendBotMessage(sender, "⚠️ Ainda não te mostrei nenhum modelo pra comparar. Quer ver algumas opções?");
    }
    const contexto = `
    Você é Anna, especialista da Vertex Store.
    
    Siga exatamente as diretrizes abaixo para responder qualquer cliente:
    
    TOM DE VOZ:
    ${JSON.stringify(tomDeVozVertex, null, 2)}
    
    OBJEÇÕES COMUNS:
    ${JSON.stringify(objeçõesVertexBoleto, null, 2).slice(0, 3000)}

       OBJEÇÕES SOBRE PAYJOY:
    ${JSON.stringify(informacoesPayjoy).slice(0, 3500)}
    
    GATILHOS EMOCIONAIS:
    ${JSON.stringify(gatilhosEmocionaisVertex, null, 2)}
    `;

    // 🧠 Prompt formatado para a IA
    const prompt = `
  ## OBJETIVO
  Guiar o cliente até escolher um smartphone da lista apresentada e fechar a venda,
  sempre valorizando experiência, suporte humanizado e diferencial da loja.
  esteja sempre preparado para responder duvidas de objeções que não necessariamente ligados ao modelo em si, utlize a documentação para respoder essa objeções e seja criativo
  *** SEMPRE AO FALAR DE PREÇOS DEIXE BEM CLARO QUE ESSE VALORES SÃO ESTIMATIVAS E QUE PODEM FLUTUAR DE ACORDO COM A DISPONIBILIDADE DA PAY JOY ***
  ## TOM_DE_VOZ
  - Saudação acolhedora porém direta.
  - Use vocativo informal respeitoso (ex.: “Perfeito, ${nome}!”).
  - Emojis: 💜 obrigatório + 1 contextual; use 🔥 para descontos.
  - Até 250 caracteres por bloco; quebre linhas por assunto.
  - Pontuação dupla (“!!”, “…” ) permitida.

  ## GATILHOS_EMOCIONAIS
  - Priorize Segurança ➜ Rapidez ➜ Transferência de dados na hora.
  - Explore “Garantia empática”, “Telefone reserva”, “Loja física confiável”.
  - Conecte benefícios à vida diária (produtividade, memórias, status).

  ## OBJEÇÕES & COMPARATIVOS
  - Se cliente comparar preço online → explique valor agregado (lista de diferenciais).
  - Descontos: no boleto não descontos
  - Parcelamento padrão apenas em 18×; .
  - Use analogias para comparar serviços (ex.: “comprar só preço é como…”).

   ## OBJEÇÕES DE DUVIDAS SOBRE BOLETO(OBJEÇÕES SOBRE PAYJOY:)

  ## REGRAS_DE_ESTILO
  - Nunca comece com saudação completa; a conversa já está em andamento.
  - Seja conciso e humanizado; máximo 3 blocos (“emoção”, “benefício”, “call-to-action”).
  - Sempre feche perguntando algo que avance (ex.: “Fecho em 10× pra você?”).

  📜 Histórico da conversa:
  ${conversaCompleta}

  🧠 Última mensagem do cliente:
  "${entrada}"

  📱 Modelos apresentados:
  ${modelos.map(m => `➡️ *${m.nome}*\n💵 Preço: R$ ${m.preco.toFixed(2)}`).join("\n")}

  Nome do cliente: ${nome}
  `;

    const respostaIA = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: contexto },
        { role: "user", content: prompt }
      ],
      temperature: 1.0,
      max_tokens: 200
    });

    const respostaFinal = respostaIA.choices[0]?.message?.content?.trim();

    if (!respostaFinal) {
      return await sendBotMessage(sender, "📌 Estou verificando... Pode repetir a dúvida de forma diferente?");
    }

    return await sendBotMessage(sender, respostaFinal);
  },
  identificarModeloPorNome: async (sender, _args, { msgContent, pushName }) => {
    await setUserStage(sender, "agente_de_demonstracao_por_nome_por_boleto");
    const novoStage = await getUserStage(sender);
    await sendBotMessage(sender, novoStage);
    return await agenteDeDemonstracaoPorNomePorBoleto({ sender, msgContent, pushName });
  }
};

 

module.exports = { agenteDeDemonstracaoPosDecisaoPorBoleto };
