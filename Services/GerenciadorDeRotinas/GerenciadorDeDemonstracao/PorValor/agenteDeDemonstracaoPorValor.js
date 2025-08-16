const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  getUserStage,
  getUserResponses,
  appendToConversation, 
  getNomeUsuario,
  storeUserResponse
} = require("../../../redisService");

const { getAllCelulares } = require("../../../dbService");
const extrairNumeroDeTexto = require("./extratoNumeroDeTexto");
const { extrairTextoDoQuotedMessage } = require("../../../utils/utilitariosDeMensagem/extrairTextoDoQuotedMessage");

 

const obterModelosDoBling = async () => {
  try {
    const celulares = await getAllCelulares();
    console.log("📋 Primeiro item completo:", celulares[0]);

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
          nome: c.nome || "Modelo sem nome",
          preco: c.preco || 0,
          descricaoCurta: c.descricao || "Descrição indisponível.",
          imagemURL: c.imageURL || "https://felipebelmont.com/wp-content/uploads/2025/05/Design-sem-nome-23.png",
          precoParcelado: c.precoParcelado || "",
          fraseImpacto: c.fraseImpacto || "",
          subTitulo: c.subTitulo || ""
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

const agenteDeDemonstracaoPorValor = async ({ sender, pushName, valorBruto, msgContent}) => {
  const quotedTexto = extrairTextoDoQuotedMessage(msgContent);

let textoDeReferencia =
  msgContent?.conversation ||
  msgContent?.extendedTextMessage?.text ||
  "";

if ((!textoDeReferencia || textoDeReferencia.toLowerCase().includes("esse")) && quotedTexto) {
  console.log("📎 Substituindo texto do cliente pela legenda da mensagem citada:");
  console.log("🔁 Antes:", textoDeReferencia);
  console.log("✅ Depois:", quotedTexto);
  textoDeReferencia = quotedTexto;
}

  try {
    const respostas = await getUserResponses(sender, "sondagem");
    const valorTexto = valorBruto || respostas?.investimento || "";
    const numeroExtraido = extrairNumeroDeTexto(valorTexto);

    if (!numeroExtraido || isNaN(numeroExtraido)) {
      await setUserStage(sender, "filtro_de_valor"); // 👈 garante que continue no fluxo certo
      await storeUserResponse(sender, "sondagem", "investimento", valorTexto); // 👈 opcional, para histórico/debug
      const frases = [
        "💡 Pra acertar na indicação, me passa uma ideia de quanto quer investir — tipo “mil e quinhentos” ou “até dois mil”? 💜",
        "📊 Para filtrar os melhores modelos, preciso de um valor-base. Quanto pensa em investir? Ex.: 1000 reais ou até 2 mil. 💜",
        "💬 Consigo ajudar melhor se souber seu orçamento: pode informar algo como “R$ 2 000” ou “até mil e quinhentos”? 💜"
      ];
      
      const fraseAleatoria = frases[Math.floor(Math.random() * frases.length)];
      
      return await sendBotMessage(sender, fraseAleatoria);      
    }
    

    const faixaMin = numeroExtraido - 350;
    const faixaMax = numeroExtraido + 650;

    const celulares = await obterModelosDoBling();
    if (!Array.isArray(celulares) || celulares.length === 0) {
      return await sendBotMessage(
        sender,
        "⚠️ O sistema da loja está com instabilidade no momento. Tente novamente em alguns minutos. 🙏"
      );
    }

    const modelosFiltrados = celulares.filter((cel) =>
      cel.preco >= faixaMin && cel.preco <= faixaMax
    );

    if (modelosFiltrados.length === 0) {
      const nome = await getNomeUsuario(sender, pushName);  
      await setUserStage(sender, "filtro_de_valor");
    
      const frases = [
        `😕 Opa ${nome}, eu dei uma olhadinha aqui nos nossos modelos e não encontrei nenhum aparelho dentro da sua faixa de investimento. Quer tentar outro valor?`,
        `🙁 Hmm... por enquanto não temos aparelhos exatamente nesse valor, ${nome}. Que tal tentar uma faixa diferente?`,
        `🔎 Dei uma verificada nos modelos, ${nome}, e infelizmente não encontrei nada nessa faixa. Mas posso procurar com outro valor, se preferir!`
      ];
    
      // Escolhe uma frase aleatória
      const fraseEscolhida = frases[Math.floor(Math.random() * frases.length)];
    
      return await sendBotMessage(sender, fraseEscolhida);
    }
    

    await sendBotMessage(
      sender,
      `Boa! Com essa faixa de valor eu tenho uns aparelhos que entregam muito 🔥`
    );
    

    for (const modelo of modelosFiltrados) {
      const copy = [
        `🔥 *${modelo.nome}* 🔥`,
        "",
        modelo.subTitulo,
        "",
        modelo.descricaoCurta,
        "",
        `💰 ${modelo.precoParcelado}`,
        "",
        modelo.fraseImpacto,
        "",
        `💸 Preço: R$${modelo.preco.toFixed(2)}`
      ].join("\n");

      await sendBotMessage(sender, {
        imageUrl: modelo.imagemURL,
        caption: copy
      });

      await appendToConversation(sender, {
        tipo: "modelo_sugerido_json",
        conteudo: modelo,
        timestamp: new Date().toISOString()
      });

      await appendToConversation(sender, {
        tipo: "modelo_confirmado",
        conteudo: modelo.nome,
        timestamp: new Date().toISOString()
      });
      ;
    }

    await setUserStage(sender, "identificar_modelo_por_nome_pos_demonstracao_por_valor");
    const stage = await getUserStage(sender);
    console.log(`📶 [DEBUG] Stage atualizado para: ${stage}`);
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    await delay(2000);
    await sendBotMessage(sender, "*Por que na Vertex Store?*\n\n📲 *Sai com tudo configurado, transferência de dados e suporte de verdade*.\n⚙ *Se rolar garantia, é rápido e tem celular reserva.*\n\n_*Simples assim. Padrão Vertex.*_ 💜");
    await delay(2000);
    await sendBotMessage(sender, "➡️ *Desses, qual mais te chamou atenção?*");
     
  } catch (error) {
    console.error("❌ Erro no agenteDeDemonstracaoPorValor:", error);
    await sendBotMessage(
      sender,
      "❌ Ocorreu um erro ao buscar os modelos. Tente novamente mais tarde."
    );
  }
};

module.exports = { agenteDeDemonstracaoPorValor };
