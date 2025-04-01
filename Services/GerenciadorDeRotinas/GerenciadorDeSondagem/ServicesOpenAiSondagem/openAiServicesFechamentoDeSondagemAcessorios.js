const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,   
  getUserResponses
} = require("../../../redisService");
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const handlers = {
  obterTipoAcessorio: async (sender, _acessorio, pushName) => {
    await sendBotMessage(sender, `🛍️ Oi ${pushName}, sobre qual acessório você está falando? Temos: película, capa, cabo, caixa de som, smartwatch, fone de ouvido e carregador.`);
  },
  especificarAcessorio: async (sender, acessorio, pushName) => {
    const perguntas = {
      "fone de ouvido": "Você prefere fone com fio ou sem fio?",
      "smartwatch": "O smartwatch é para academia, uso casual ou ambos?",
      "caixa de som": "Você quer uma caixa de som para casa, festas ou para o seu comércio?",
      "película": "A película é de vidro comum, 3D, ou com proteção extra?",
      "capa": "Você quer uma capa transparente, reforçada, carteira ou com estilo específico?",
      "carregador": "Você precisa de carregador rápido, comum ou sem fio?",
      "cabo": "Qual tipo de cabo você procura? Tipo-C, Lightning ou MicroUSB?"
    };

    const pergunta = perguntas[acessorio.toLowerCase()] || "Poderia me dizer mais sobre esse acessório?";
    await sendBotMessage(sender, pergunta);
  },
  concluirSondagem: async (sender, acessorio, especificacao, pushName) => {
    await sendBotMessage(sender, `✅ Perfeito ${pushName}, entendi que você busca um ${acessorio} para: ${especificacao}. Já vou te mostrar as opções disponíveis!`);
    await setUserStage(sender, "demonstracao_de_produtos");
  }
};

const functions = [
  {
    name: "obterTipoAcessorio",
    description: "Pergunta ao cliente qual acessório ele deseja.",
    parameters: {
      type: "object",
      properties: {
        pergunta: { type: "string", enum: ["acessorio"] }
      },
      required: ["pergunta"]
    }
  },
  {
    name: "especificarAcessorio",
    description: "Solicita detalhes sobre o tipo de acessório mencionado.",
    parameters: {
      type: "object",
      properties: {
        acessorio: { type: "string" }
      },
      required: ["acessorio"]
    }
  },
  {
    name: "concluirSondagem",
    description: "Finaliza a coleta de informações e direciona para demonstração.",
    parameters: {
      type: "object",
      properties: {
        acessorio: { type: "string" },
        especificacao: { type: "string" }
      },
      required: ["acessorio", "especificacao"]
    }
  }
];

const agenteDeFechamentoSondagemDeAcessorio = async (sender, msgContent, pushName) => {
  await setUserStage(sender, "agente_de_sondagem_acessorio");

  try {
    const respostas = await getUserResponses(sender, "sondagem");
    const acessorio = respostas.acessorio || "";
    const especificacao = respostas.especificacao || "";

    const messages = [
      {
        role: "system",
        content: `Você é Anna, assistente de vendas da VertexStore. Classifique e oriente o cliente sobre os acessórios.`
      },
      {
        role: "user",
        content: `Acessório: ${acessorio || "NÃO INFORMADO"}, Especificação: ${especificacao || "NÃO INFORMADO"}, Entrada: ${msgContent}`
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages,
      functions,
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
          args.acessorio || acessorio,
          args.especificacao || "",
          pushName
        );
      }
    }

    return await sendBotMessage(sender, response.message.content || "❓ Poderia me dar mais detalhes sobre o acessório?");
  } catch (error) {
    console.error("❌ Erro no agente de acessórios:", error);
    return await sendBotMessage(sender, "❌ Ocorreu um erro. Tente novamente mais tarde.");
  }
};

module.exports = { agenteDeFechamentoSondagemDeAcessorio };