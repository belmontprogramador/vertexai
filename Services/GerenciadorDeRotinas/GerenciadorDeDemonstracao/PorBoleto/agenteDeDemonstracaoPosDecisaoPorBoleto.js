const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  appendToConversation,
  getConversation,
  getNomeUsuario,
  getUserStage
} = require("../../../redisService");
 
 
const { informacoesPayjoy } = require("../../../utils/informacoesPayjoy");
const { gatilhosEmocionaisVertex } = require('../../../utils/gatilhosEmocionais');
const { tomDeVozVertex } = require('../../../utils/tomDeVozVertex');
const { objeçõesVertexBoleto } = require("../../../utils/objecoesBoleto");
const { rotinaDeAgendamento } = require("../../GerenciadorDeAgendamento/rotinaDeAgendamento");
const { handlers: handlersDemonstracaoDetalhadaBoleto, agenteDeDemonstracaoDetalhadaBoleto } = require("../../../GerenciadorDeRotinas/GerenciadorDeDemonstracao/agenteDeDemonstracaoDetalhadaBoleto");

const {getAllCelulareBoleto } = require('../../../dbService')

const OpenAI = require("openai");
 
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const agenteDeDemonstracaoPosDecisaoPorBoleto = async ({ sender, msgContent, pushName, quotedMessage }) => {
  try {
    await setUserStage(sender, "identificar_modelo_por_nome_pos_demonstração_por_valor");
    

    let entrada = typeof msgContent === "string" ? msgContent : msgContent?.termosRelacionados || "";
    if (quotedMessage) entrada = `${entrada} || Mensagem citada: ${quotedMessage}`;
    entrada = entrada.trim().replace(/^again\s*/i, "") || "o cliente marcou uma mensagem mas não escreveu nada";

    await appendToConversation(sender, entrada);

     
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `🤖 Você é Anna, assistente virtual da Vertex Store.
O cliente já viu modelos de celular. Agora ele pode:

1. Escolher um modelo final → demonstracaoDetalhada
2. Fazer pergunta sobre os modelos sugeridos → responderDuvida
3. Mencionar novo modelo ou mudar de ideia → identificarModeloPorNome

══════════ MODELOS JÁ APRESENTADOS ══════════
${modelosRecentes.map(m => `- ${m.nome}`).join("\n") || "(nenhum modelo encontrado)"}

══════════ DECISÃO IMPORTANTE ══════════
⚠️ Se o cliente mencionar QUALQUER outro modelo que não está na lista acima, chame identificarModeloPorNome.
⚠️ Só chame responderDuvida se estiver claramente falando dos modelos sugeridos.

╔═ CONTEXTO ═╗
Histórico: ${conversaCompleta}`
        },
        { role: "user", content: entrada }
      ],
      functions,
      function_call: "auto"
    });

    const { function_call } = completion.choices[0]?.message || {};

    if (!function_call) {
      return await handlers["responderDuvida"](sender, {}, {
        msgContent: entrada,
        quotedMessage,
        pushName,
        conversaCompleta
      });
    }

    const { name, arguments: argsStr } = function_call;
    const args = argsStr ? JSON.parse(argsStr) : {};

    if (handlers[name]) {
      return await handlers[name](sender, args, {
        msgContent: entrada,
        quotedMessage,
        pushName,
        conversaCompleta
      });
    }

    console.warn(`⚠️ Função não reconhecida: ${name}`);
    return await sendBotMessage(sender, "⚠️ Não entendi sua escolha. Pode repetir?");
  } catch (error) {
    console.error("❌ Erro no identificarModeloPorNomePosDemonstração:", error);
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
    console.log("📩 Conteúdo recebido:", { msgContent, quotedMessage });

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

    await appendToConversation(sender, entrada);

    const historico = await getConversation(sender);
    const conversaCompleta = historico
      .map(f => f.replace(/^again\s*/i, "").trim())
      .slice(-10)
      .join(" | ");

    const modelosBanco = await getAllCelulareBoleto();
    const nome = await getNomeUsuario(sender);

    const modelosRecentes = historico
  .filter(m => m.startsWith("modelo_sugerido_json:") || m.startsWith("modelo_sugerido:"))
  .map(m => {
    try {
      return m.startsWith("modelo_sugerido_json:")
        ? JSON.parse(m.replace("modelo_sugerido_json: ", ""))
        : { nome: m.replace("modelo_sugerido: ", ""), descricaoCurta: "(descrição não disponível)", preco: 0 };
    } catch {
      return null;
    }
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

const functions = [
  {
    name: "demonstracaoDetalhadaBoleto",
    description: "Chama a função para mostrar o modelo que o usuário escolheu.",
    parameters: {
      type: "object",
      properties: {
        modeloMencionado: { type: "string", description: "Nome exato do modelo escolhido." }
      },
      required: ["modeloMencionado"]
    }
  },
  {
    name: "responderDuvida",
    description: "Responde a uma dúvida específica do cliente sobre um ou mais modelos sugeridos anteriormente. Tire duvidas gerais sobre indecisao do cliente que não estao necessariamente ligadas ao modelo",
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
  {
    name: "identificarModeloPorNome",
    description: "Cliente mudou de ideia e pediu um novo modelo.",
    parameters: {
      type: "object",
      properties: {}
    }
  }
];

module.exports = { agenteDeDemonstracaoPosDecisaoPorBoleto };
