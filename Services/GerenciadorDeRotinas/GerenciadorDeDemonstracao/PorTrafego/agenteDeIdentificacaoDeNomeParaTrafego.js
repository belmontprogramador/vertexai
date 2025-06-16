const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  storeNomeUsuario,  
} = require("../../../redisService");
const { rotinaDeDemonstracaoDeCelularPorValor } = require("../PorValor/rotinaDeDemonstracaoDeCelularPorValor");
 

const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔹 Funções para lidar com os caminhos da decisão
const handlers = {
  salvar_nome_usuario: async (sender, args, extras) => {
    const { msgContent, pushName } = extras; // ✅ agora sim!
    const nome = args.nome;
    await storeNomeUsuario(sender, nome);
    await setUserStage(sender, "rotina_de_demonstracao_de_celular_por_valor");
    return await rotinaDeDemonstracaoDeCelularPorValor({ sender, msgContent, pushName });
  },  

  pedir_nome_novamente: async (sender) => {
    await setUserStage(sender, "agente_de_identificação_de_nome");
    const frases = [ `A gente adora atender bem, e seu nome é fundamental pra isso. Como devo te chamar? 💜`,
      `Compartilha seu nome com a gente? Assim ajustamos tudo pra te atender do seu jeito 💜`
] 
const fraseEscolhida = frases[Math.floor(Math.random() * frases.length)];  
    return await sendBotMessage(sender,fraseEscolhida);
  }
};

// 🔹 Definição das funções (tools)
const functions = [
  {
    name: "salvar_nome_usuario",
    description: "Identificar o nome do usuario por exemplo 'felipe', 'julia', 'fernado', 'amanda'.Armazena o nome informado pelo usuário.",
    parameters: {
      type: "object",
      properties: {
        nome: {
          type: "string",
          description: "O usuario vai informar o nome dele."
        }
      },
      required: ["nome"]
    }
  },
  {
    name: "pedir_nome_novamente",
    description: "Usuário ainda não informou o nome, pedir novamente."
  }
];

// 🔹 Agente principal
const agenteDeIdentificacaoDeNomeParaTrafego = async ({ sender, msgContent, pushName }) => {
  await setUserStage(sender, "agente_de_identificação_de_nome");
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `
Você é Anna, assistente virtual da Vertex Store.

Sua única missão é identificar o *primeiro nome* do cliente com base no que ele escreveu.

Regras:
- Se ele disser o nome isoladamente ou numa frase como "meu nome é João", "sou o Lucas", "me chamo Ana", "aqui é Carlos", chame a função "salvar_nome_usuario" com o nome extraído.
- Se o nome estiver em uma frase, **extraia apenas o primeiro nome**, mesmo que ele diga "meu nome é João da Silva", salve "João".
- Se ele não disser nada que pareça um nome, ou for ambíguo (ex: "quero celular", "oi", "tudo bem"), chame "pedir_nome_novamente".
- Use uma frase diferente a cada  interação para indentificar o nome

⚠️ Nunca invente nomes. Se não houver um nome claro, peça de novo.
`
        },
        { role: "user", content: msgContent }
      ],
      functions,
      function_call: "auto"
    });

    const toolCall = completion.choices[0]?.message?.function_call;
    if (toolCall) {
      const { name, arguments: argsStr } = toolCall;
      const args = argsStr ? JSON.parse(argsStr) : {};

      if (handlers[name]) {
        return await handlers[name](sender, args, { msgContent, pushName });
      }
    }

    // fallback
    await sendBotMessage(sender, "🤖 Não consegui entender. Qual é o seu primeiro nome?");
    await setUserStage(sender, "agente_de_identificação_de_nome");
  } catch (error) {
    console.error("❌ Erro no agenteDeIdentificacaoDeNome:", error.message);
    await sendBotMessage(sender, "⚠️ Ocorreu um erro ao tentar identificar seu nome. Pode repetir?");
  }
};

module.exports = { agenteDeIdentificacaoDeNomeParaTrafego };