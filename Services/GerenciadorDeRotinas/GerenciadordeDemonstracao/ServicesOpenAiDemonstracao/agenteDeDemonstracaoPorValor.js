const { sendBotMessage } = require("../../../messageSender");
const OpenAI = require("openai");
const { setUserStage } = require("../../../redisService");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const celulares = [
  { nome: "Samsung Galaxy A14", preco: 1299, descricao: "Tela de 6.6\", 128GB, 4GB RAM, bateria de 5000mAh. Ideal para uso diário e redes sociais." },
  { nome: "Motorola Moto E22", preco: 1149, descricao: "64GB, Câmera dupla, Tela 6.5\" HD+. Perfeito para quem busca o básico com estilo." },
  { nome: "Xiaomi Redmi 12C", preco: 1399, descricao: "128GB, 4GB RAM, processador MediaTek Helio G85. Ótimo custo-benefício." },
  { nome: "Samsung Galaxy M14 5G", preco: 1599, descricao: "5G, 128GB, 6GB RAM, bateria de 6000mAh. Ideal para quem busca desempenho e autonomia." },
  { nome: "Motorola Moto G73 5G", preco: 1799, descricao: "256GB, 8GB RAM, processador Dimensity 930. Excelente para multitarefa e jogos leves." },
  { nome: "Realme C55", preco: 1699, descricao: "128GB, 6GB RAM, câmera de 64MP. Ideal para fotos e vídeos." },
  { nome: "Samsung Galaxy A54 5G", preco: 2399, descricao: "256GB, 8GB RAM, câmera tripla, super AMOLED 120Hz. Design premium com ótimo desempenho." },
  { nome: "Motorola Edge 40 Neo", preco: 2699, descricao: "256GB, 12GB RAM, tela pOLED 144Hz. Potência e elegância para usuários exigentes." },
  { nome: "iPhone SE (3ª geração)", preco: 3199, descricao: "64GB, chip A15 Bionic. Ótimo para quem busca iOS com tamanho compacto." },
  { nome: "Xiaomi Poco X6 Pro", preco: 2899, descricao: "256GB, 12GB RAM, processador Dimensity 8300-Ultra. Potência para gamers e multitarefa pesada." }
];

const formatarCelular = (cel) => `📱 *${cel.nome}* - R$${cel.preco}\n_${cel.descricao}_\n`;

const functions = [
  {
    name: "exibirModelosPorValor",
    description: "Filtra os modelos disponíveis de celular até o valor mencionado.",
    parameters: {
      type: "object",
      properties: {
        valor: {
          type: "string",
          description: "Valor informado pelo cliente, pode estar por extenso ou misturado com texto."
        }
      },
      required: ["valor"]
    }
  }
];

const handlers = {
  exibirModelosPorValor: async (sender, args) => {
    const valorBruto = args?.valor || "";
    const valorNumerico = parseFloat(valorBruto.replace(/[^\d]/g, ""));
    console.log("💰 [DEBUG] Valor identificado:", valorBruto, "->", valorNumerico);

    if (isNaN(valorNumerico)) {
      return await sendBotMessage(sender, "❌ Não consegui entender o valor que você mencionou. Poderia repetir?");
    }

    const filtrados = celulares.filter(cel => cel.preco <= valorNumerico);

    if (filtrados.length === 0) {
      return await sendBotMessage(sender, `😕 Não encontrei modelos até *R$${valorNumerico}*. Mas posso tentar buscar algo próximo, quer?`);
    }

    await sendBotMessage(sender, `📦 Encontrei esses modelos até *R$${valorNumerico}*:`);

    for (let i = 0; i < filtrados.length; i += 3) {
      const lote = filtrados.slice(i, i + 3).map(formatarCelular).join("\n");
      await sendBotMessage(sender, lote);
    }

    await sendBotMessage(sender, "❓ *Gostaria de tirar alguma dúvida sobre esses modelos ou deseja finalizar a compra de algum deles?*");
  }
};

const agenteDeDemonstracaoPorValor = async ({ sender, msgContent, produto, finalidadeUso, investimento, pushName }) => {
  await setUserStage(sender, "agente_de_demonstração");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "Você é Anna, assistente da VertexStore. Seu trabalho é extrair o valor mencionado pelo cliente, mesmo que esteja por extenso ou dentro de frases, e chamar a função exibirModelosPorValor com esse valor."
        },
        {
          role: "user",
          content: `O cliente disse que deseja investir: "${investimento}"`
        }
      ],
      functions,
      function_call: "auto"
    });

    const choice = completion.choices[0];

    if (choice.finish_reason === "function_call") {
      const { name, arguments: argsJson } = choice.message.function_call;
      const args = JSON.parse(argsJson);

      if (handlers[name]) {
        return await handlers[name](sender, args);
      }
    }

    await sendBotMessage(sender, "❌ Não consegui identificar o valor que você mencionou. Poderia repetir?");
  } catch (error) {
    console.error("❌ Erro no agente de demonstração:", error);
    await sendBotMessage(sender, "❌ Tive um problema ao buscar os modelos. Pode tentar de novo em instantes?");
  }
};

module.exports = { agenteDeDemonstracaoPorValor };
