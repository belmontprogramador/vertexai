const { sendBotMessage } = require("../../messageSender");
const {
  setLastInteraction,
  getUserStage,
  setStageHistory,
  setUserStage,
} = require("../../redisService");
const { pipelineConhecendoALoja } = require("../../ServicesKommo/pipelineConecendoALoja");

// ✅ Lista de celulares disponíveis
const celulares = [
  {
    nome: "Samsung Galaxy A14",
    preco: 1299,
    descricao: "Tela de 6.6\", 128GB, 4GB RAM, bateria de 5000mAh. Ideal para uso diário e redes sociais.",
  },
  {
    nome: "Motorola Moto E22",
    preco: 1149,
    descricao: "64GB, Câmera dupla, Tela 6.5\" HD+. Perfeito para quem busca o básico com estilo.",
  },
  {
    nome: "Xiaomi Redmi 12C",
    preco: 1399,
    descricao: "128GB, 4GB RAM, processador MediaTek Helio G85. Ótimo custo-benefício.",
  },
  {
    nome: "Samsung Galaxy M14 5G",
    preco: 1599,
    descricao: "5G, 128GB, 6GB RAM, bateria de 6000mAh. Ideal para quem busca desempenho e autonomia.",
  },
  {
    nome: "Motorola Moto G73 5G",
    preco: 1799,
    descricao: "256GB, 8GB RAM, processador Dimensity 930. Excelente para multitarefa e jogos leves.",
  },
  {
    nome: "Realme C55",
    preco: 1699,
    descricao: "128GB, 6GB RAM, câmera de 64MP. Ideal para fotos e vídeos.",
  },
  {
    nome: "Samsung Galaxy A54 5G",
    preco: 2399,
    descricao: "256GB, 8GB RAM, câmera tripla, super AMOLED 120Hz. Design premium com ótimo desempenho.",
  },
  {
    nome: "Motorola Edge 40 Neo",
    preco: 2699,
    descricao: "256GB, 12GB RAM, tela pOLED 144Hz. Potência e elegância para usuários exigentes.",
  },
  {
    nome: "iPhone SE (3ª geração)",
    preco: 3199,
    descricao: "64GB, chip A15 Bionic. Ótimo para quem busca iOS com tamanho compacto.",
  },
  {
    nome: "Xiaomi Poco X6 Pro",
    preco: 2899,
    descricao: "256GB, 12GB RAM, processador Dimensity 8300-Ultra. Potência para gamers e multitarefa pesada.",
  },
];

// ✅ Função para formatar celular
const formatarCelular = (cel) =>
  `📱 *${cel.nome}* - R$${cel.preco}\n_${cel.descricao}_\n`;

const rotinaDeDemonstracao = async ({ sender, msgContent, produto, finalidadeUso, investimento, pushName }) => {
  try {
    const currentTime = Date.now();
    await setLastInteraction(sender, currentTime);

    const stageAtual = await getUserStage(sender);
    await setStageHistory(sender, stageAtual);
    await setUserStage(sender, "sequencia_de_demonstracao");

    await pipelineConhecendoALoja(`+${sender}`);

    await sendBotMessage(sender, `📢 Olá ${pushName}, com base no que você me disse, separei alguns modelos incríveis pra você.`);

    // 🔍 Tratamento seguro do valor de investimento
    const valorInvestimento = parseFloat(investimento?.replace(/[^\d]/g, ''));
    const valorMaximo = isNaN(valorInvestimento) ? Infinity : valorInvestimento;

    // 🔍 Marca buscada
    const produtoLower = produto?.toLowerCase() || "";
    const marcas = ["samsung", "motorola", "xiaomi", "iphone", "realme"];
    const marcaDesejada = marcas.find(marca => produtoLower.includes(marca)) || null;

    // 🔎 Filtro de celulares
    const celularesFiltrados = celulares.filter(cel => {
      const dentroDoPreco = cel.preco <= valorMaximo;
      const correspondeMarca = marcaDesejada ? cel.nome.toLowerCase().includes(marcaDesejada) : true;
      return dentroDoPreco && correspondeMarca;
    });

    const modelosParaExibir = celularesFiltrados.length > 0 ? celularesFiltrados : celulares;

    if (celularesFiltrados.length === 0) {
      await sendBotMessage(sender, "😕 Não encontrei modelos exatos dentro da faixa, mas posso te recomendar os mais próximos!");
    }

    // Enviar os modelos em lotes de 3
    for (let i = 0; i < modelosParaExibir.length; i += 3) {
      const lote = modelosParaExibir.slice(i, i + 3).map(formatarCelular).join("\n");
      await sendBotMessage(sender, lote);
    }

    await sendBotMessage(sender, `✨ Gostou de algum modelo ou quer que eu te mostre mais opções?`);
  } catch (error) {
    console.error("❌ Erro na rotinaDeDemonstracao:", error);
    await sendBotMessage(sender, "❌ Ocorreu um erro ao te mostrar os modelos disponíveis. Tente novamente mais tarde.");
  }
};

module.exports = { rotinaDeDemonstracao };
