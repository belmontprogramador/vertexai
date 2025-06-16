const { sendBotMessage } = require("../../messageSender");
const {
  setUserStage,
  storeNomeUsuario,  
} = require("../../redisService");
const { rotinaDeBoleto } = require("../GerenciadorDeDemonstracao/PorBoleto/rotinaDeBoleto");

const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔹 Funções para lidar com os caminhos da decisão
const handlers = {
  salvar_nome_usuario: async (sender, args, extras) => {
    const { msgContent } = extras;
    const nome = args.nome;
    await storeNomeUsuario(sender, nome);
    await setUserStage(sender, "rotina_de_boleto");
    return await rotinaDeBoleto({ sender, msgContent, pushName: nome });
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
          description: "O usuario vai informar o nome dele"
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
const agenteDeIdentificacaoDeNomeParaBoleto = async ({ sender, msgContent, pushName }) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `
          Você é Anna, assistente da Vertex Store. Seu único objetivo agora é identificar o **primeiro nome** do cliente.
          
          📌 Regras essenciais:
          - Sempre que o cliente disser algo como "me chamo Ana", "sou o Lucas", "aqui é o João", ou até "meu nome é João da Silva", chame a função salvar_nome_usuario com **apenas o primeiro nome** (ex: "João").
          - Aceite frases naturais, informais ou abreviadas, como "Ana aqui", "É o João", "Lucas falando", "eu Ana", etc.
          - Ignore sobrenomes, emojis, números ou saudações.
          - Caso o texto **não contenha nenhum nome**, ou pareça genérico demais ("oi", "bom dia", "quero celular", "me ajuda"), chame a função pedir_nome_novamente.
          
          ⚠️ Nunca invente nomes. Se não encontrar um nome claro, prefira chamar pedir_nome_novamente.
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
        return await handlers[name](sender, args, { msgContent });
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

module.exports = { agenteDeIdentificacaoDeNomeParaBoleto };