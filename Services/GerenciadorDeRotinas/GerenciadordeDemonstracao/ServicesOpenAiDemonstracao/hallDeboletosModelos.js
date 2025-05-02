const {
    getChosenModel,
    storeChosenModel,
    setUserStage
  } = require("../../../../Services/redisService");
  
  const { agenteDeDemonstracaoBoleto } = require("./agenteDeDemonstracaoBoleto");
  const { sendBotMessage } = require("../../../messageSender");
  
  const modelosBoleto = [
    {
      nome: "XIAOMI NOTE 14",
      nfc: false,
      entrada: "300,00",
      parcela: "150,00"
    },
    {
      nome: "REALME C61",
      nfc: true,
      entrada: "199,00",
      parcela: "145,00"
    },
    {
      nome: "NOTE 60",
      nfc: false,
      entrada: "150,00",
      parcela: "100,00"
    },
    {
      nome: "REALME C75",
      nfc: true,
      entrada: "288,00",
      parcela: "174,00"
    }
  ];
  
  const normalizar = (texto) =>
    texto.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/gi, "")
      .toLowerCase();
  
  const tokenizar = (texto) => normalizar(texto).split(/\s+/).filter(Boolean);
  
  const hallDeboletosModelos = async ({ sender, msgContent, pushName }) => {
    const entradaOriginalCompleta = await getChosenModel(sender);
    const entradaOriginal = entradaOriginalCompleta.replace(/^again\s+/i, '').trim();
    const tokensEntrada = tokenizar(entradaOriginal);
  
    // Match baseado em similaridade textual
    const matches = modelosBoleto.map((modelo) => {
      const tokensModelo = tokenizar(modelo.nome);
      const comuns = tokensEntrada.filter(token => tokensModelo.includes(token));
      const relevancia = comuns.length / Math.max(tokensEntrada.length, 1);
      return { modelo, relevancia };
    }).filter(m => m.relevancia > 0.3);
  
    if (matches.length > 0) {
      const escolhido = matches.sort((a, b) => b.relevancia - a.relevancia)[0].modelo;
      await storeChosenModel(sender, escolhido.nome);
      await setUserStage(sender, "aguardando_decisao_pos_demo");
      return await agenteDeDemonstracaoBoleto({ sender, modelo: escolhido.nome, pushName });

    }
  
    // Se não encontrar, envia lista completa e seta stage
    const listaFormatada = modelosBoleto.map((m) => (
      `📲 *${m.nome}* - ${m.nfc ? "COM NFC" : "SEM NFC"}\nEntrada: *a partir de R$ ${m.entrada}*\nParcelas: *a partir de R$ ${m.parcela}*\n`
    )).join("\n");
  
    const observacao = `➡️ *LEMBRANDO QUE TODOS OS VALORES SÃO APENAS UMA ESTIMATIVA*, pois a análise é feita pela PayJoy e pode variar de acordo com o perfil de cada cliente.`;
  
    await setUserStage(sender, "aguardando_decisao_pos_demo");
  
    await sendBotMessage(sender,
      `🤖 Não consegui identificar o modelo que você mencionou.\n\nAqui estão os disponíveis:\n\n${listaFormatada}\n${observacao}`
    );
    await storeChosenModel(sender, escolhido.nome);
  
    return;
  };
  
  module.exports = { hallDeboletosModelos };
  