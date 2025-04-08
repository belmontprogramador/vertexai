// agenteDeFechamentoSondagem.js

const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  storeUserResponse,
  getUserResponses
} = require("../../../redisService");
const { rotinaDeDemonstracao } = require("../../GerenciadorDeDemonstracao/rotinaDeDemonstracao");
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Handlers para lidar com as funções que o modelo pode chamar
const handlers = {
  obterProduto: async (sender, _produto, _finalidade, _investimento, pushName) => {
    await sendBotMessage(sender, `📱 Oi ${pushName}, entendo que possa haver diversos modelos eu marcas de seu interesese, porem me diga uma marca e modelo do celular você está buscando, para que eu posso dar um atendimento top!`);
  },
  obterFinalidadeUso: async (sender, _produto, _finalidade, _investimento, pushName) => {
    await sendBotMessage(sender, `🤔 Para que você pretende usar esse celular? Trabalho, lazer, redes sociais...?`);
  },
  obterInvestimento: async (sender, _produto, _finalidade, _investimento, pushName) => {
    await sendBotMessage(sender, `💰 Qual é o seu orçamento aproximado para esse celular?`);
  },
  demonstrarProdutos: async (sender, msgContent, produto, finalidadeUso, investimento, pushName) => {   
    await setUserStage(sender, "demonstracao_de_produtos");
    await rotinaDeDemonstracao({ sender, msgContent, produto, finalidadeUso, investimento, pushName });
  }
  
};

// Funções disponíveis que o modelo pode chamar
const functions = [
  {
    name: "obterProduto",
    description: "Perguntar ao usuário qual celular ele está buscando.",
    parameters: {
      type: "object",
      properties: {
        pergunta: { type: "string", enum: ["produto"] }
      },
      required: ["pergunta"]
    }
  },
  {
    name: "obterFinalidadeUso",
    description: "Perguntar ao usuário para que ele usará o celular.",
    parameters: {
      type: "object",
      properties: {
        pergunta: { type: "string", enum: ["finalidadeUso"] }
      },
      required: ["pergunta"]
    }
  },
  {
    name: "obterInvestimento",
    description: "Perguntar ao usuário qual é o orçamento.",
    parameters: {
      type: "object",
      properties: {
        pergunta: { type: "string", enum: ["investimento"] }
      },
      required: ["pergunta"]
    }
  },
  {
    name: "demonstrarProdutos",
    description: "Todas as informações foram coletadas. Pode iniciar a demonstração.",
    parameters: {
      type: "object",
      properties: {
        produto: { type: "string" },
        finalidadeUso: { type: "string" },
        investimento: { type: "string" }
      },
      required: ["produto", "finalidadeUso", "investimento"]
    }
  }
];

// Função auxiliar para classificar nova resposta do usuário e atualizar o Redis
const classificarENormalizarEntrada = async (sender, msgContent) => {
  const cleaned = msgContent.replace(/^again\s*/i, "").trim().toLowerCase();

  const res = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content: `Você deve classificar a resposta do cliente em apenas uma das categorias a seguir: "produto", "finalidadeUso", "investimento" ou "desconhecido".

Instruções:
- **Produto:** Se a resposta mencionar alguma das marcas conhecidas (Apple, Samsung, Xiaomi, Motorola, Huawei, Realme, Oppo, Asus) – seja isoladamente ou em um contexto maior.
- **FinalidadeUso:** Se a resposta indicar o uso pretendido do aparelho (ex.: uso diário, trabalho, jogos, presente, fotografia, etc.).
- **Investimento:** Se a resposta mencionar um valor, seja numérico (ex.: 2000), escrito por extenso (ex.: "dois mil reais") ou com/sem o símbolo "R$".

Responda apenas com a categoria identificada, sem mais comentários.
`
      },
      { role: "user", content: cleaned }
    ],
    temperature: 0,
    max_tokens: 10
  });

  const categoria = res.choices[0].message.content.toLowerCase();
  if (["produto", "finalidadeuso", "investimento"].includes(categoria)) {
    const chave = categoria === "produto" ? "pergunta_1" : categoria === "finalidadeuso" ? "pergunta_2" : "pergunta_3";
    await storeUserResponse(sender, "sondagem", chave, cleaned);
  }
};

// Função principal
const agenteDeFechamentoSondagem = async (sender, msgContent, _produto, _finalidadeUso, _investimento, pushName) => {
  await setUserStage(sender, "agente_de_fechamento_de_sondagem");
  try {
    await classificarENormalizarEntrada(sender, msgContent);

    const respostas = await getUserResponses(sender, "sondagem");
    const produto = respostas.pergunta_1;
    const finalidadeUso = respostas.pergunta_2;
    const investimento = respostas.pergunta_3;

    const messages = [
      {
        role: "system",
        content: `Você é Anna, atendente especializada da VertexStore. Seu papel é **analisar as respostas do cliente e executar diretamente a função correspondente** com base nas informações fornecidas.

        Informações a analisar:
        - Produto: Marca e modelo do celular
        - FinalidadeUso: Para que ele usará (trabalho, lazer, jogos, etc.)
        - Investimento: Quanto pretende gastar
        
        Regras:
        1. Se uma das três informações estiver **faltando ou pouco clara**, **execute a função correspondente** para perguntar diretamente ao cliente.
           - Se estiver faltando o produto → execute a função "obterProduto"
           - Se estiver faltando a finalidade de uso → execute a função "obterFinalidadeUso"
           - Se estiver faltando o investimento → execute a função "obterInvestimento"
        
        2. Se as três informações estiverem completas, execute a função "demonstrarProdutos" com os dados informados.
        
        ⚠️ Você **não deve responder com texto diretamente ao usuário**. Sempre execute uma das funções.`
        
      },
      {
        role: "user",
        content: `Produto: ${produto || "NÃO INFORMADO"}, Finalidade: ${finalidadeUso || "NÃO INFORMADO"}, Investimento: ${investimento || "NÃO INFORMADO"}`
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages,
      functions,
      function_call: "auto",
      temperature: 0.7
    });

    const response = completion.choices[0];

    if (response.finish_reason === "function_call" && response.message.function_call) {
      const functionName = response.message.function_call.name;
      const args = JSON.parse(response.message.function_call.arguments || "{}");

      console.log(`🔹 GPT sugeriu executar: ${functionName}`);

      if (handlers[functionName]) {
        return await handlers[functionName](
          sender,
          msgContent,
          args.produto || produto,
          args.finalidadeUso || finalidadeUso,
          args.investimento || investimento,
          pushName
        );
      }
    }
   
  } catch (error) {
    console.error("❌ Erro no agente de fechamento de sondagem:", error);
    return await sendBotMessage(sender, "❌ Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.");
  }
};

module.exports = { agenteDeFechamentoSondagem };
