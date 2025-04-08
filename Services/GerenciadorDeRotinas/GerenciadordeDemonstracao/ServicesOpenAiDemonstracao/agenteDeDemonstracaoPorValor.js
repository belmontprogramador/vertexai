const { sendBotMessage } = require("../../../messageSender");
const OpenAI = require("openai");
const { setUserStage, storeSelectedModel } = require("../../../redisService"); 
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const celulares = [
  { nome: "Samsung Galaxy A14", preco: 1299, descricao: "Tela de 6.6\", 128GB, 4GB RAM, bateria de 5000mAh." },
  { nome: "Motorola Moto E22", preco: 1149, descricao: "64GB, Câmera dupla, Tela 6.5\" HD+." },
  { nome: "Xiaomi Redmi 12C", preco: 1399, descricao: "128GB, 4GB RAM, MediaTek Helio G85." },
  { nome: "Samsung Galaxy M14 5G", preco: 1599, descricao: "5G, 128GB, 6GB RAM, bateria de 6000mAh." },
  { nome: "Motorola Moto G73 5G", preco: 1799, descricao: "256GB, 8GB RAM, Dimensity 930." },
  { nome: "Realme C55", preco: 1699, descricao: "128GB, 6GB RAM, câmera de 64MP." },
  { nome: "Samsung Galaxy A54 5G", preco: 2399, descricao: "256GB, 8GB RAM, super AMOLED 120Hz." },
  { nome: "Motorola Edge 40 Neo", preco: 2699, descricao: "256GB, 12GB RAM, pOLED 144Hz." },
  { nome: "iPhone SE (3ª geração)", preco: 3199, descricao: "64GB, chip A15 Bionic." },
  { nome: "Xiaomi Poco X6 Pro", preco: 2899, descricao: "256GB, 12GB RAM, Dimensity 8300-Ultra." }
];

const formatarCelular = (cel) => `📱 *${cel.nome}* - R$${cel.preco}\n_${cel.descricao}_\n`;

const agenteDeDemonstracaoPorValor = async ({ sender, msgContent, produto, finalidadeUso, investimento, pushName }) => {
  await setUserStage(sender, "agente_de_demonstração");
  console.log(investimento);

  try {
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `Você receberá uma frase de um cliente sobre quanto ele quer gastar${investimento}. Ela pode vir em diferentes formatos exemplo:
          "ate mil e quinhentos reais"
          "1500"
          " to pensando em gastra 2000reais"
           Extraia somente o valor numérico em reais. Exemplo:

- Entrada: "até mil e quinhentos reais"
- Saída: 1500

Nunca responda com nada além do número.`
        },
        {
          role: "user",
          content: investimento
        }
      ],
      temperature: 0,
      max_tokens: 10
    });

    const valorExtraido = gptResponse.choices[0].message.content;
    const valorNumerico = parseFloat(valorExtraido.replace(/[^\d]/g, ""));
    console.log(valorNumerico);

    console.log("💰 [DEBUG] Valor extraído:", investimento, "->", valorNumerico);

    if (isNaN(valorNumerico)) {
      return await sendBotMessage(sender, "❌ Não consegui entender o valor que você mencionou. Poderia repetir?");
    }

    const filtrados = celulares.filter(cel => cel.preco <= valorNumerico);

    if (filtrados.length === 0) {
      return await sendBotMessage(sender, `😕 Não encontrei modelos até *R$${valorNumerico}*. Mas posso tentar buscar algo próximo, quer?`);
    }

    await sendBotMessage(sender, `✅ Saquei ${pushName}, vou te mostrar alguns modelos aqui da loja.`);
    await sendBotMessage(sender, `📦 Encontrei esses modelos até *R$${valorNumerico}*:`);

    for (let i = 0; i < filtrados.length; i += 3) {
      const lote = filtrados.slice(i, i + 3).map(formatarCelular).join("\n");
      await sendBotMessage(sender, lote);
    }

    await sendBotMessage(sender, "🤔 *Qual desses modelos mais te interessou?* Me diga o nome para que eu te mostre mais detalhes!");
    await setUserStage(sender, "agente_de_demonstração_capturar");

   // Captura e armazena os modelos disponíveis para futura comparação
const nomesModelos = filtrados.map(c => c.nome);
const modelosFormatados = nomesModelos.join(" | ");
await storeSelectedModel(sender, modelosFormatados);
console.log("💾 [DEBUG] Modelos sugeridos armazenados no Redis:", modelosFormatados);
  } catch (err) {
    console.error("❌ Erro ao extrair valor com GPT:", err);
    await sendBotMessage(sender, "❌ Tive um problema para entender o valor. Pode tentar novamente?");
  }
};

module.exports = { agenteDeDemonstracaoPorValor };
