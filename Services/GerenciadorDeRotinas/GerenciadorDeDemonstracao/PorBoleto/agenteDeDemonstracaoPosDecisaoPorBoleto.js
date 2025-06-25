const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,  
  appendToConversation
} = require("../../../redisService");
const { informacoesPayjoy } = require("../../../utils/informacoesPayjoy");
const { gatilhosEmocionaisVertex } = require('../../../utils/gatilhosEmocionais');
const { tomDeVozVertex } = require('../../../utils/tomDeVozVertex');
const { objeçõesVertexBoleto } = require("../../../utils/objecoesBoleto");;
const { handlers: handlersDemonstracaoDetalhadaBoleto, agenteDeDemonstracaoDetalhadaBoleto } = require("../../../GerenciadorDeRotinas/GerenciadorDeDemonstracao/agenteDeDemonstracaoDetalhadaBoleto");
const { getConversation } = require("../../../HistoricoDeConversas/conversationManager");
const { getAllCelulareBoleto } = require('../../../dbService')
const { sanitizarEntradaComQuoted } = require("../../../utils/utilitariosDeMensagem/sanitizarEntradaComQuoted");
const { prepararContextoDeModelosRecentes } = require("../../../utils/utilitariosDeMensagem/prepararContextoDeModelosRecentes");
const OpenAI = require("openai");
const { agenteDeDemonstracaoPorNomePorBoleto } = require("./agenteDeDemonstracaoPorNomePorBoleto");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const obterModelosDoBling = async () => {
  try {
    const celulares = await getAllCelulareBoleto();

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

const agenteDeDemonstracaoPosDecisaoPorBoleto = async ({ sender, msgContent, pushName, quotedMessage }) => {
  try {
    await setUserStage(sender, "agente_de_demonstracao_pos_decisao_por_boleto");

    const entrada = await sanitizarEntradaComQuoted(sender, msgContent, quotedMessage);

    const { modelos, modelosConfirmados, nomeUsuario, conversaCompleta } = await prepararContextoDeModelosRecentes(sender);

    // 🎯 Tenta detectar similaridade de entrada com algum modelo
    const listaModelos = await obterModelosDoBling();
    const similares = await calcularSimilaridadePorEmbeddings(entrada, listaModelos);
    const maisProvavel = similares?.[0];

    if (maisProvavel?.score > 0.90) {
      console.log("✅ Entrada casa fortemente com modelo:", maisProvavel.modelo);
      await appendToConversation(sender, {
        tipo: "deliberacao_toa",
        conteudo: {
          acao: "demonstracaoDetalhadaBoleto",
          motivo: `Cliente mencionou ${maisProvavel.modelo} com alta similaridade`,
          argumento: { modeloMencionado: maisProvavel.modelo }
        },
        timestamp: new Date().toISOString()
      });

      return await handlers.demonstracaoDetalhadaBoleto(sender, {
        modeloMencionado: maisProvavel.modelo
      }, { msgContent: entrada });
    }

    // 🤖 Deliberação TOA
    const deliberarPossibilidades = async () => {
      const prompt = `
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
      
      💡 Quais são as 3 possibilidades mais prováveis que o cliente quer com essa mensagem?
      
      1. Se — e SOMENTE SE — o cliente disser explicitamente frases como "fechou", "quero esse", "vamos fechar", "é esse mesmo", "bora", "fechado", ou mencionar uma data exata de fechamento como "vou hoje", "passo aí amanhã", "mês que vem", então ele está confirmando um dos modelos sugeridos. Escolha **demonstracaoDetalhadaBoleto**.
      
      2. Se o cliente fizer QUALQUER pergunta (mesmo sem ponto de interrogação) — como "é bom?", "e esse?", "a câmera é boa?", "qual o preço?" — **sobre qualquer um dos modelos apresentados anteriormente**, ou **sobre o último modelo confirmado**, interprete como dúvida ou indecisão. Escolha **responderDuvida**.
      
      ⚠️ Mesmo se o cliente mencionar o nome do modelo de novo ou compará-lo com outro lugar (ex: Mercado Livre), se esse modelo já foi apresentado, ainda assim escolha **responderDuvida**, pois o cliente já demonstrou interesse anteriormente.
      
      3. Se ele mencionar um modelo que **ainda não foi apresentado na conversa** e **também não é o último confirmado**, escolha **agenteDeDemonstracaoPorNomePorBoleto**. Isso indica que o cliente está abrindo uma nova intenção.
      
      Retorne apenas isso:
      {
        "acao": "NOME_DA_ACAO",
        "motivo": "Texto explicando por que esta ação foi escolhida",
        "argumento": {
          "nomeModelo": ""
        }
      }
      `;     

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

    const resultadoTOA = await deliberarPossibilidades();
    const acaoEscolhida = resultadoTOA?.acao;
    console.log("🎯 Resultado TOA:", JSON.stringify(resultadoTOA, null, 2));

    // 🔐 Grava modelo confirmado só se a TOA deliberar isso com clareza
if (acaoEscolhida === "agenteDeDemonstracaoPorNomePorBoleto") {
  const nomeModelo = resultadoTOA.argumento?.nomeModelo?.trim();
  if (nomeModelo && !modelosConfirmados.includes(nomeModelo)) {
    await appendToConversation(sender, {
      tipo: "modelo_confirmado",
      conteudo: nomeModelo,
      timestamp: new Date().toISOString()
    });
  }
}

  // ✅ ⬇️ Aqui tratamos ambiguidade se a TOA escolher mostrarResumoModeloBoleto
if (acaoEscolhida === "demonstracaoDetalhadaBoleto") {
  let nomeModelo = resultadoTOA.argumento?.nomeModelo?.trim();
  console.log(`aqui dentro do pos decisão eu chamei o resumomodelo com esse modelo confirmado ${nomeModelo}`)

  if (!nomeModelo) {
    if (modelosConfirmados.length === 1) {
      // Só um modelo confirmado → usar direto
      nomeModelo = modelosConfirmados[0];
      resultadoTOA.argumento.nomeModelo = nomeModelo;

      await appendToConversation(sender, {
        tipo: "modelo_confirmado",
        conteudo: nomeModelo,
        timestamp: new Date().toISOString()
      });

    } else {
      // Múltiplos modelos ou nenhum → pedir confirmação  
      await setUserStage(sender, "agente_de_demonstração_detalhada_boleto");   

      await sendBotMessage(sender, `⚠️ ${nomeUsuario}, você falou que quer fechar, mas fiquei na dúvida sobre qual modelo exatamente.`);

      if (modelosConfirmados.length > 1) {
        const lista = modelosConfirmados.map(m => `✔️ *${m}*`).join("\n");
        await sendBotMessage(sender, `Você pode confirmar qual desses modelos quer?\n\n${lista}`);
      } else {
        await sendBotMessage(sender, `Você pode me dizer qual o modelo que quer fechar?`);
      }

      return; // ⚠️ IMPORTANTE: não segue pro handler se ainda não temos nomeModelo
    }
  }
 // ✅ Garante que o modelo está gravado como confirmado
 if (!modelosConfirmados.includes(nomeModelo)) {
  await appendToConversation(sender, {
    tipo: "modelo_confirmado",
    conteudo: nomeModelo,
    timestamp: new Date().toISOString()
  });
}
  
}

// 🎬 Execução da ação
if (handlers[acaoEscolhida]) {
  return await handlers[acaoEscolhida](sender, resultadoTOA.argumento || {}, {
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
      m?.tipo === "modelo_sugerido_json" &&
      typeof m?.conteudo?.nome === "string" &&
      m.conteudo.nome.toLowerCase() === args.nomeModelo.toLowerCase()
    );
  
    let modeloEscolhido;
  
    if (!modeloJaMostrado && args?.modeloMencionado) {
      const modelos = await getAllCelulareBoleto();
      modeloEscolhido = modelos.find(m =>
        m.nome.toLowerCase() === args.modeloMencionado.toLowerCase()
      );
    }
  
    // Se encontrou o modelo, chama direto o resumo
    if (modeloEscolhido) {
      return await handlersDemonstracaoDetalhadaBoleto.mostrarResumoModeloBoleto(sender,
      { nomeModelo: modeloEscolhido.nome },
       { modeloEscolhido });
    }
  
    // Fallback: chama o resumo mesmo que o modelo já tenha sido mostrado ou não foi encontrado de novo
    return await handlersDemonstracaoDetalhadaBoleto.mostrarResumoModeloBoleto(sender, { nomeModelo: args.nomeModelo }, {});
  },  
  responderDuvida: async (sender, args, extras) => {
    await setUserStage(sender, "agente_de_demonstracao_pos_decisao_por_boleto");

    const { msgContent, quotedMessage } = extras;

    const entrada = await sanitizarEntradaComQuoted(sender, msgContent, quotedMessage);     

    const { modelos, nomeUsuario,  modelosConfirmados, conversaCompleta } = await prepararContextoDeModelosRecentes(sender);

    if (modelos.length === 0) {
      return await sendBotMessage(sender, "⚠️ Ainda não te mostrei nenhum modelo pra comparar. Quer ver algumas opções?");
    }

    let modeloFocado = null;

if (args?.nomeModelo) {
  const normalizar = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const nomeNormalizado = normalizar(args.nomeModelo);

  // 1️⃣ Tenta encontrar entre os modelos recentes
  modeloFocado = modelos.find(m => normalizar(m.nome) === nomeNormalizado);

  // 2️⃣ Fallback: busca no banco se não estiver entre os recentes
  if (!modeloFocado) {
    const todos = await getAllCelulareBoleto();
    modeloFocado = todos.find(m => normalizar(m.nome) === nomeNormalizado);
  }
}


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
// 🔁 Se o modelo focado veio do banco e ainda não está na lista, adiciona na lista de modelos
if (modeloFocado && !modelos.find(m => m.nome.toLowerCase() === modeloFocado.nome.toLowerCase())) {
  modelos.push(modeloFocado);
}

const historico = await getConversation(sender);
const ultimaTOA = [...historico].reverse().find(msg => msg.tipo === "deliberacao_toa");

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

  ## REGRAS_DE_ESTILO
  - Nunca comece com saudação completa; a conversa já está em andamento.
  - Seja conciso e humanizado; máximo 3 blocos (“emoção”, “benefício”, “call-to-action”).
  - Sempre feche perguntando algo que avance (ex.: “Fecho em 10× pra você?”).

  
  🧠 Última mensagem do cliente:
      "${entrada}"

  📜 Histórico da conversa:
        ${conversaCompleta}
 Utilize a ultima decisão TOA para te ajudar na resolução de duvida
        ${ultimaTOA}           
      
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
  agenteDeDemonstracaoPorNomePorBoleto: async (sender, args, { msgContent, pushName }) => {
    await setUserStage(sender, "agente_de_demonstracao_por_nome_por_boleto");
    // Salva como modelo confirmado
    const nomeModelo = args?.nomeModelo?.trim();

    return await agenteDeDemonstracaoPorNomePorBoleto({ sender, msgContent, pushName, modeloMencionado: nomeModelo });
  },


};



module.exports = {
  agenteDeDemonstracaoPosDecisaoPorBoleto,
  
};

