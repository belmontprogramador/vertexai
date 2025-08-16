const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,  
  appendToConversation
} = require("../../../redisService");
const { informacoesPayjoy } = require("../../../utils/documentacoes/informacoesPayjoy");
const { gatilhosEmocionaisVertex } = require('../../../utils/documentacoes/gatilhosEmocionais');
const { tomDeVozVertex } = require('../../../utils/documentacoes/tomDeVozVertex');
const { objeçõesVertexBoleto } = require("../../../utils/documentacoes/objecoesBoleto");;
const { handlers: handlersDemonstracaoDetalhadaBoleto, agenteDeDemonstracaoDetalhadaBoleto } = require("../../../GerenciadorDeRotinas/GerenciadorDeDemonstracao/agenteDeDemonstracaoDetalhadaBoleto");
const { getConversation } = require("../../../HistoricoDeConversas/conversationManager");
const { getAllCelulareBoleto } = require('../../../dbService')
const { sanitizarEntradaComQuoted } = require("../../../utils/utilitariosDeMensagem/sanitizarEntradaComQuoted");
const { prepararContextoDeModelosRecentes } = require("../../../utils/utilitariosDeMensagem/prepararContextoDeModelosRecentes");
const OpenAI = require("openai");
const { agenteDeDemonstracaoPorNomePorBoleto } = require("./agenteDeDemonstracaoPorNomePorBoleto");
const { enviarResumoParaNumeros } = require("../../../utils/enviarResumoParaNumeros");
const { registrarTagModeloConfirmado } = require("../../../ServicesKommo/registrarTagModeloConfirmado");
require("dotenv").config();
const { atualizarValorVendaDoLead } = require("../../../ServicesKommo/atualizarValorVendaDoLead");
const { pipelineAtendimentoHumanoBoleto } = require("../../../ServicesKommo/pipelineAtendimentoHumanoBoleto");



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
      
      1. **demonstracaoDetalhadaBoleto** → quando estiver decidido ou indicar desejo de finalizar, mesmo que sem palavras exatas como "fechou". Ex: “gostei muito desse”, “acho que vou aí amanhã”, “vamos ver esse aí”.
      1.1 - Se o cliente disser explicitamente que quer quer fechar a venda respondendo a pergunta do bot sobre visitar a loja. Escolha **demonstracaoDetalhadaBoleto**.
      2. Se o cliente fizer QUALQUER pergunta (mesmo sem ponto de interrogação) — como "é bom?", "e esse?", "a câmera é boa?", "qual o preço?" — **sobre qualquer um dos modelos apresentados anteriormente**, ou **sobre o último modelo confirmado**, interprete como dúvida ou indecisão. Escolha **responderDuvida**.
      
      ⚠️ Mesmo se o cliente mencionar o nome do modelo de novo ou compará-lo com outro lugar (ex: Mercado Livre), se esse modelo já foi apresentado, ainda assim escolha **responderDuvida**, pois o cliente já demonstrou interesse anteriormente.
      
      3. Se ele mencionar um modelo que **ainda não foi apresentado na conversa** e **também não é o último confirmado**, escolha **agenteDeDemonstracaoPorNomePorBoleto**. Isso indica que o cliente está abrindo uma nova intenção.
      
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
      await setUserStage(sender, "agente_de_demonstracao_detalhada_boleto");   

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
    await setUserStage(sender, "agente_de_demonstracao_detalhada_boleto");     
  
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
  
     // ✅ Executa o resumo com ou sem modelo pré-exibido
  if (modeloEscolhido) {
    resultado = await handlersDemonstracaoDetalhadaBoleto.mostrarResumoModeloBoleto(
      sender,
      { nomeModelo: modeloEscolhido.nome },
      { modeloEscolhido }
    );
  } else {
    resultado = await handlersDemonstracaoDetalhadaBoleto.mostrarResumoModeloBoleto(
      sender,
      { nomeModelo: args.nomeModelo },
      {}
    );
  }

  // ✅ Sempre envia o resumo após mostrar
  await enviarResumoParaNumeros(sender);

  return resultado;
  },  
  responderDuvida: async (sender, args, extras) => {
    await setUserStage(sender, "agente_de_demonstracao_pos_decisao_por_boleto");

    // ✅ Movimenta o lead para o pipeline de atendimento humano, se necessário
  try {
    await pipelineAtendimentoHumanoBoleto(sender);
  } catch (err) {
    console.warn("⚠️ Erro ao mover lead para atendimento humano:", err.message);
  }
  
    const { msgContent, quotedMessage } = extras;
    const entrada = await sanitizarEntradaComQuoted(sender, msgContent, quotedMessage);
  
    const { modelos, nomeUsuario, modelosConfirmados, conversaCompleta } =
      await prepararContextoDeModelosRecentes(sender);
  
    if (modelos.length === 0) {
      return await sendBotMessage(sender, "⚠️ Ainda não te mostrei nenhum modelo pra comparar. Quer ver algumas opções?");
    }
  
    let modeloFocado = null;
  
    if (args?.nomeModelo) {
      const normalizar = (str) =>
        str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const nomeNormalizado = normalizar(args.nomeModelo);
  
      // Tenta encontrar entre os modelos recentes
      modeloFocado = modelos.find((m) => normalizar(m.nome) === nomeNormalizado);
  
      // Fallback: busca no banco se não estiver entre os recentes
      if (!modeloFocado) {
        const todos = await getAllCelulareBoleto();
        modeloFocado = todos.find((m) => normalizar(m.nome) === nomeNormalizado);
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
      descricaoModelos = modelos.map((m) => `
  ➡️ *${m.nome}*
  💬 Descrição: ${m.descricaoCurta}
  🧠 Subtítulo: ${m.subTitulo}
  💡 Frase impacto: ${m.fraseImpacto}
  💵 Preço: R$ ${m.preco.toFixed(2)}
  💳 Parcelado: ${m.precoParcelado}
  🖼️ Imagem: ${m.imagemURL}
  `).join("\n");
    }
  
    // ✅ Sempre registra tag no Kommo se houver modelo focado
    if (modeloFocado) {
      const modeloJaNaLista = modelos.find(m => m.nome.toLowerCase() === modeloFocado.nome.toLowerCase());
      if (!modeloJaNaLista) {
        modelos.push(modeloFocado); // adiciona na lista para IA responder com ele
      }
  
      try {
        await registrarTagModeloConfirmado(sender, modeloFocado.nome);
        console.log(`✅ Tag registrada para modelo: ${modeloFocado.nome}`);
      } catch (err) {
        console.warn("⚠️ Erro ao registrar tag no Kommo:", err.message);
      }

      try {
        await atualizarValorVendaDoLead(`${sender}@c.us`, modeloFocado.preco);
        console.log(`💰 Valor do lead atualizado para R$ ${modeloFocado.preco}`);
      } catch (err) {
        console.warn("⚠️ Erro ao atualizar valor do lead no Kommo:", err.message);
      }
      
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
  
    const prompt = `
  ## OBJETIVO
  Guiar o cliente até escolher um smartphone da lista apresentada e fechar a venda,
  sempre valorizando experiência, suporte humanizado e diferencial da loja.
  Esteja sempre preparado para responder dúvidas de objeções que não necessariamente ligadas ao modelo em si.
  Utilize a documentação para responder essas objeções e seja criativo.
  *** SEMPRE ao falar de preços, deixe claro que são estimativas e podem flutuar conforme disponibilidade da PayJoy. ***
  
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
  - Descontos: no boleto, não há descontos.
  - Parcelamento apenas em 18x.
  - Use analogias para comparar serviços (ex.: “comprar só preço é como…”).
  
  ## REGRAS_DE_ESTILO
  - Nunca comece com saudação completa; a conversa já está em andamento.
  - Seja conciso e humanizado; máximo 3 blocos: “emoção”, “benefício”, “call-to-action”.
  - Sempre feche perguntando algo que avance (ex.: “Fecho em 10× pra você?”).
  
  📍 Endereço:
  Av. Getúlio Varga, 333, Centro, Araruama - RJ, Brasil. CEP 28979-129
  📌 Referência: Mesma calçada da loteria e xerox do bolão, em frente à faixa de pedestre
  🕘 Atendimento: De 09:00 às 19:00, de segunda a sábado

  **NOS NÃO POSSUIMOS IPHONE PARA EVNDA NA LOJA, DIGA DE MODO SUAVE QUE TRABALHAMOS APENAS COM A LINHA REDMI POCO E REALME, HIPOTESE NENHUMA RESPONDE QUE TRABALHOMOS COM IPHONE**
  
  🧠 Última mensagem do cliente:
  "${entrada}"
  
  📜 Histórico da conversa:
  ${conversaCompleta}
  
  🧠 Última decisão TOA:
  ${JSON.stringify(ultimaTOA, null, 2)}
  
  📱 Modelos apresentados:
  ${descricaoModelos}
  
  ✔️ Modelos confirmados anteriormente:
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
  
    const respostaFinal = respostaIA.choices?.[0]?.message?.content?.trim();
  
    if (!respostaFinal) {
      return await sendBotMessage(sender, "📌 Estou verificando... Pode repetir a dúvida de forma diferente?");
    }
  
    // ✅ Envia resumo para os internos após responder dúvida sobre modelo
    await enviarResumoParaNumeros(sender);
  
    return await sendBotMessage(sender, respostaFinal);
  }, 
  responderDuvidasGenericas: async (sender, args, extras) => {
    await setUserStage(sender, "agente_de_demonstracao_pos_decisao_por_boleto");
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

    // ✅ Envia o resumo para os internos mesmo após dúvida genérica
  await enviarResumoParaNumeros(sender);
  
    return await sendBotMessage(sender, respostaFinal);
  },
  agenteDeDemonstracaoPorNomePorBoleto: async (sender, args, { msgContent, pushName }) => {
    await setUserStage(sender, "agente_de_demonstracao_por_nome_por_boleto");
    // Salva como modelo confirmado
    const nomeModelo = args?.nomeModelo?.trim();

    return await agenteDeDemonstracaoPorNomePorBoleto({ sender, msgContent, pushName, modeloMencionado: nomeModelo });
  },
  //mostrar todos os modelos


};



module.exports = {
  agenteDeDemonstracaoPosDecisaoPorBoleto,
  
};

