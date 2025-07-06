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
const { informacoesPayjoy } = require("../../utils/documentacoes/informacoesPayjoy");
const { gatilhosEmocionaisVertex } = require('../../utils/documentacoes/gatilhosEmocionais');
const { tomDeVozVertex } = require('../../utils/documentacoes/tomDeVozVertex');
const { objeçõesVertexBoleto } = require("../../utils/documentacoes/objecoesBoleto");;
const { tomDeVozVertexData } = require("../../utils/documentacoes/tomDeVozVertexData");
const { extrairTextoDoQuotedMessage } = require("../../utils/utilitariosDeMensagem/extrairTextoDoQuotedMessage");
const { sanitizarEntradaComQuoted } = require("../../utils/utilitariosDeMensagem/sanitizarEntradaComQuoted");
const { prepararContextoDeModelosRecentes } = require("../../utils/utilitariosDeMensagem/prepararContextoDeModelosRecentes");

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
    await setUserStage(sender, "agente_de_demonstracao_detalhada_boleto");

    const nome = await getNomeUsuario(sender);
    const textoQuoted = extrairTextoDoQuotedMessage(msgContent);

    let entradaAtual = typeof msgContent === "string" ? msgContent : msgContent?.termosRelacionados || "";     

    await appendToConversation(sender, {
      tipo: "entrada_usuario",
      conteudo: entradaAtual,
      timestamp: new Date().toISOString()
    });

    const conversaArray = await getConversation(sender);
    const conversaCompleta = conversaArray
      .map(msg => {
        try {
          const json = typeof msg === "string" ? JSON.parse(msg) : msg;
          return json.conteudo || "";
        } catch {
          return typeof msg === "string" ? msg : "";
        }
      })
      .filter(Boolean)
      .slice(-10)
      .join(" | ");

    const listaModelos = await obterModelosDoBling();

    const similares = await calcularSimilaridadePorEmbeddings(entradaAtual, listaModelos);
    console.log(`Esse foi o match de similaridade${similares}`)
    const maisProvavel = similares?.[0];
    console.log(`Esse foi o match de similaridade${maisProvavel}`)

    if (maisProvavel?.score > 0.90) {
      console.log("✅ Entrada casa fortemente com modelo:", maisProvavel.modelo);
      await appendToConversation(sender, {
        tipo: "deliberacao_toa",
        conteudo: {
          acao: "mostrarResumoModeloBoleto",
          motivo: `Cliente mencionou ${maisProvavel.modelo} com alta similaridade`,
          argumento: { modeloMencionado: maisProvavel.modelo }
        },
        timestamp: new Date().toISOString()
      });

      return await mostrarResumoModeloBoleto(sender, {
        modeloMencionado: maisProvavel.modelo
      }, { msgContent: entradaAtual });
    }

    const promptTOA = `
🤖 Você é Anna, assistente virtual da Vertex Store.

Seu objetivo é identificar a ação ideal com base na intenção do cliente.

📌 Entrada:
"${entradaAtual}"

📜 Histórico da conversa:
${conversaCompleta}

📦 Modelos disponíveis:
${listaModelos.map(m => `- ${m.nome}`).join("\n")}

1. **fecharVenda** → quando estiver decidido ou indicar desejo de finalizar, mesmo que sem palavras exatas como "fechou". Ex: “gostei muito desse”, “acho que vou aí amanhã”, “vamos ver esse aí”.

⚠️ Só escolha "fecharVenda" se já houver uma execução anterior da ação "mostrarResumoModeloBoleto" com o modelo confirmado. Passe o modelo com argumento

2. Se o cliente fizer **qualquer pergunta**, mesmo curta (ex.: "é bom?", "qual o preço?", "tem câmera boa?"), isso significa que ele ainda está com dúvida e precisa de mais informações. Escolha "responderDuvida".

⚠️ SE o cliente mencionar claramente um modelo (ex: "o note 60 é bom?"), você DEVE preencher o campo "argumento.nomeModelo" com o nome exato do modelo mencionado.

3. Se ele mencionar um modelo da lista e não for uma pergunta, escolha "mostrarResumoModeloBoleto".

⚠️ Quando escolher "mostrarResumoModeloBoleto" você também DEVE preencher "argumento.nomeModelo" com o nome exato do modelo citado.

 4. Se a mensagem do cliente **não mencionar nenhum modelo**,  
e a dúvida parecer geral, filosófica, comportamental ou fora do escopo dos modelos —  
ex: "vocês vendem usados?", "e se der defeito?", "vocês tem loja física?",  
"qual é o diferencial de vocês?", "vocês são confiáveis?", "aceitam cartão?"  
— então entenda que é uma dúvida genérica.  
Escolha: **"responderDuvidasGenericas"**

Retorne apenas isso:
{
  "acao": "NOME_DA_ACAO",
  "motivo": "Texto explicando por que esta ação foi escolhida",
  "argumento": {}
}`;

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

    return await handlers[acao](sender, argumento, { msgContent: entradaAtual });

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
    await setUserStage(sender, "agente_de_demonstracao_detalhada_boleto");
  
    const nome = await getNomeUsuario(sender);
    let modelo = extras?.modeloEscolhido;
  
    const normalize = (str) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/gi, "")
        .replace(/\s+/g, " ")
        .trim();
  
    const listaModelos = await obterModelosDoBling();
  
    // 🔎 Se não veio modelo direto, tenta pelo nome passado como argumento
    if (!modelo && args?.nomeModelo) {
      modelo = listaModelos.find(m => normalize(m.nome) === normalize(args.nomeModelo));
    }
  
    // 🔍 Fallback: tenta recuperar do histórico
    if (!modelo) {
      const historico = await getConversation(sender);
      const confirmados = historico
        .filter(m => m.tipo === "modelo_confirmado")
        .map(m => typeof m.conteudo === "string" ? m.conteudo : "")
        .filter(Boolean);
  
      // ⚠️ Se houver mais de um modelo confirmado, pede escolha explícita
      if (confirmados.length > 1) {
        return await sendBotMessage(sender, `📌 Perfeito, ${nome}! Conversamos sobre mais de um modelo.\nPode me dizer qual deles você quer ver agora?`);
      }
  
      // ✅ Se houver apenas um, tenta localizar no catálogo
      if (confirmados.length === 1) {
        const confirmado = confirmados[0];
        modelo = listaModelos.find(m => normalize(m.nome) === normalize(confirmado));
      }
    }
  
    if (!modelo) {
      return await sendBotMessage(sender, `⚠️ Opa ${nome}, não consegui identificar com clareza o modelo que você quer ver.\nPode me dizer o nome exato?`);
    }
  
    // 📦 Prompt resumido para IA gerar o pitch do modelo
    const prompt = [
      {
        role: "system",
        content: `Você é um vendedor persuasivo e direto. 
  Seja direto, com no máximo 3 frases curtas. Priorize clareza e impacto, não ultrapasse 250 caracteres no total.
  
  ***Faça o mais resumido possível para economizar tokens***
  Use uma linguagem formal mas descontraída.
  Pule uma linha entre o resumo e o tom de voz.
  Dê preferência ao preço parcelado.
  
  Nome do cliente: ${nome}
  
  Ao final, sempre faça perguntas utilizando esse documento como base:
  TOM DE VOZ:
  ${JSON.stringify(tomDeVozVertexData, null, 2)}`
      },
      {
        role: "user",
        content: `Modelo: ${modelo.nome}
        Frase de impacto: ${modelo.fraseImpacto}
        Descrição curta: ${modelo.descricaoCurta}
        Preço à vista: R$ ${modelo.preco.toFixed(2)}
        Preço parcelado: ${modelo.precoParcelado || "consulte condições"}`
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
      console.error("❌ Erro ao gerar resumo com GPT:", err);
      resumo = `📱 *${modelo.nome}*\n${modelo.fraseImpacto}\n💰 R$ ${modelo.preco.toFixed(2)}\n\nEm breve te explico mais!`;
    }
  
    // 💾 Salva modelo no histórico
    await appendToConversation(sender, {
      tipo: "modelo_sugerido_json",
      conteudo: modelo,
      timestamp: new Date().toISOString()
    });

    // 💾 Salva também como modelo confirmado (para referência futura)
await appendToConversation(sender, {
  tipo: "modelo_confirmado",
  conteudo: modelo.nome,
  timestamp: new Date().toISOString()
});

  
    // 📹 Envia o vídeo com resumo na legenda
    if (modelo.videoURL) {
      return await sendBotMessage(sender, {
        videoUrl: modelo.videoURL,
        caption: resumo
      });
    }
  
    // 📄 Se não tiver vídeo, envia só o texto
    return await sendBotMessage(sender, resumo);
  },  
  responderDuvida: async (sender, args, extras) => {
    await setUserStage(sender, "agente_de_demonstracao_detalhada_boleto");

    const { msgContent, quotedMessage } = extras;

    const entrada = await sanitizarEntradaComQuoted(sender, msgContent, quotedMessage);

    const { modelos, nomeUsuario,  modelosConfirmados, conversaCompleta } = await prepararContextoDeModelosRecentes(sender);

    if (modelos.length === 0) {
      return await sendBotMessage(sender, "⚠️ Ainda não te mostrei nenhum modelo pra comparar. Quer ver algumas opções?");
    }

    // 🎯 💥 Aqui entra a correção: se veio nomeModelo no argumento, foque nesse modelo
    const modeloFocado = args?.nomeModelo
      ? modelos.find(m => m.nome.toLowerCase() === args.nomeModelo.toLowerCase())
      : null;

    let descricaoModelos = "";

    if (modeloFocado) {
      descricaoModelos = `
  ➡️ *${modeloFocado.nome}*
  💬 Descrição: ${modeloFocado.descricaoCurta}
  🧠 Subtítulo: ${modeloFocado.subTitulo}
  💡 Frase impacto: ${modeloFocado.fraseImpacto}
  💵 Preço: R$ ${modeloFocado.preco.toFixed(2)}
  💳 Parcelado: ${modeloFocado.precoParcelado}
  🖼️ Imagem: ${modeloFocado.imagemURL}
  `;
    } else {
      descricaoModelos = modelos.map(m => `
  ➡️ *${m.nome}*
  💬 Descrição: ${m.descricaoCurta}
  🧠 Subtítulo: ${m.subTitulo}
  💡 Frase impacto: ${m.fraseImpacto}
  💵 Preço: R$ ${m.preco.toFixed(2)}
  💳 Parcelado: ${m.precoParcelado}
  🖼️ Imagem: ${m.imagemURL}
  `).join("\n");
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
  - Use vocativo informal respeitoso (ex.: “Perfeito, ${nomeUsuario}!”).
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
  - Parcelamento padrão apenas em 18× somente parcelamos em 18x; .
  - Use analogias para comparar serviços (ex.: “comprar só preço é como…”).

   ## OBJEÇÕES DE DUVIDAS SOBRE BOLETO(OBJEÇÕES SOBRE PAYJOY:)

   ## REGRAS_DE_INDECISÃO
- Em caso de dúvida ou indecisão, atue como consultor confiável, trazendo clareza e segurança.
- Reforce os diferenciais da Vertex:
  Pronta entrega 💨 | Pós-venda humanizado 💜 | Garantia local | Teste/backup na hora 🔧📲
- Use perguntas abertas para desbloquear a decisão:
  - “Qual parte você quer que eu explique melhor?”
  - “Está comparando com outro modelo ou loja?”
- Ofereça ajuda direta:
  - “Quer que eu compare dois modelos pra facilitar?”
  - “Prefere decidir por câmera, bateria ou desempenho?”
- Finalize com call-to-action leve:
  - “Quer que eu mostre o resumo e você decide com calma?”
- Quando a indecisão não for tecnica de aparelho nem sobre valores
  - "responda com criatividade em cima da objeção"

  ## REGRAS_DE_ESTILO
  - Nunca comece com saudação completa; a conversa já está em andamento.
  - Seja conciso e humanizado; máximo 3 blocos (“emoção”, “benefício”, “call-to-action”).
  - Sempre feche perguntando algo que avance (ex.: “Fecho em 10× pra você?”).

   "localizacaoLoja": 
      "endereco": "Av. Getúlio Varga, 333, Centro, Araruama - RJ, Brasil. CEP 28979-129",
      "referencia": "Mesma calçada da loteria e xerox do bolão, em frente à faixa de pedestre",
      "horarioFuncionamento": "De 09:00 às 19:00, de segunda a sábado"

  📜 Histórico da conversa:
        ${conversaCompleta}
      
      🧠 Última mensagem do cliente:
      "${entrada}"
      
      📱 Modelos apresentados:
      ${modelos.map(m => `➡️ *${m.nome}*\n📝 ${m.descricaoCurta}\n💵 Preço: R$ ${m.preco.toFixed(2)}`).join("\n")}
      
      Nome do cliente: ${nomeUsuario}
      
      ✅ Modelos confirmados anteriormente pelo cliente:
      ${modelosConfirmados.length > 0
        ? modelosConfirmados.map(m => `✔️ *${m}*`).join("\n")
        : "Nenhum ainda foi confirmado."}
      
      🧠 Último modelo confirmado:
      ${modelosConfirmados[modelosConfirmados.length - 1] || "nenhum"}
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
   responderDuvidasGenericas: async (sender, args, extras) => {
      await setUserStage(sender, "agente_de_demonstracao_detalhada_boleto");
      const { msgContent, quotedMessage, pushName } = extras;
      const nomeUsuario = pushName || "cliente";
    
      // 🧼 Entrada enriquecida com texto do quoted
      const entrada = await sanitizarEntradaComQuoted(sender, msgContent, quotedMessage);
    
      // ⏺️ Salva como dúvida geral
      await appendToConversation(sender, {
        tipo: "duvida_geral",
        conteudo: entrada,
        timestamp: new Date().toISOString()
      });
    
      // 📚 Carrega o contexto completo da conversa
      const {
        modelos,
        nomeUsuario: nomeUsuarioContextual,
        conversaCompleta,
        modelosConfirmados
      } = await prepararContextoDeModelosRecentes(sender);
    
      const prompt = `
    Você é Anna, especialista da Vertex Store 💜
    
    Responda a seguinte dúvida do cliente com empatia, clareza e foco em ajudar de forma informal e acolhedora.
    
    🔍 Entrada do cliente:
    "${entrada}"
    
    📦 Modelos sugeridos:
    ${modelos.length > 0
        ? modelos.map(m => `➡️ ${m.nome} - ${m.descricaoCurta} - R$ ${m.preco.toFixed(2)}`).join("\n")
        : "Nenhum modelo sugerido ainda."}
    
    ✔️ Modelos confirmados:
    ${modelosConfirmados.length > 0
        ? modelosConfirmados.map(m => `✔️ ${m}`).join("\n")
        : "Nenhum confirmado ainda."}
    
    📜 Histórico recente:
    ${conversaCompleta}
    
    💡 Instruções:
    - Se a dúvida for sobre produto, preço, garantia ou suporte → responda com clareza.
    - Se for uma dúvida fora do escopo (ex: troca, defeito, localização), oriente e diga que será encaminhada.
    - Use tom humano, empático, com emoji 💜 e uma pergunta no final.
  
    "localizacaoLoja":  
        "endereco": "Av. Getúlio Varga, 333, Centro, Araruama - RJ, Brasil. CEP 28979-129",
        "referencia": "Mesma calçada da loteria e xerox do bolão, em frente à faixa de pedestre",
        "horarioFuncionamento": "De 09:00 às 19:00, de segunda a sábado"
    `;
    
      const respostaIA = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `Você é uma atendente da Vertex Store, informal, clara e acolhedora.` },
          { role: "user", content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 350
      });
    
      const respostaFinal = respostaIA.choices?.[0]?.message?.content?.trim();
    
      if (!respostaFinal) {
        return await sendBotMessage(sender, "📩 Recebi sua dúvida, e já estou vendo com a equipe! Já te retorno 💜");
      }
    
      return await sendBotMessage(sender, respostaFinal);
    },

}

 
module.exports = {
  agenteDeDemonstracaoDetalhadaBoleto,
  handlers
  
};

