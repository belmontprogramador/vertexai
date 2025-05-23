const { sendBotMessage } = require("../../../messageSender");
const { setUserStage, getNomeUsuario } = require("../../../redisService");
const OpenAI = require("openai");

require("dotenv").config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔹 Handlers
const handlers = {
  preAprovacao: async (sender, args) => {
    const { pushName } = args;
  
    await setUserStage(sender, "open_ai_services_duvidas_boleto");
    const nome = await getNomeUsuario(sender);
    await sendBotMessage (sender, `${nome} aguarda um minutinho que eu vou verificar e ja volto aqui`)
  
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    await delay(20000); // ⏳ Espera 20 segundos
  
    const frases = [`🔥 Corre na loja, ${nome}! 🚀 Sua análise bateu aprovação altíssima. ⏰ Que horário você consegue chegar?💜`,
                    `🚀 Corre na loja, ${nome}! 🤩 Chegou agora: grau de aprovação lá em cima. 🕒 Quando pode vir?💜`,
                  `🔥Corre na loja, ${nome}! 🔥 Cadastro liberado com alta aprovação. 🗓 Qual horário fica melhor pra você hoje💜`
    ]
    const fraseEscolhida = frases[Math.floor(Math.random() * frases.length)];
    return await sendBotMessage(sender,fraseEscolhida);
  },
  naoDeuDados: async (sender) => {
    await setUserStage(sender, "open_ai_services_boleto_decisao_2");
    const nome = await getNomeUsuario(sender);   
    const frases = [`${nome} para avançar já com valores e condições, preciso fazer uma pré‑análise: nome completo, CPF e data de nascimento. Com isso, libero sua aprovação rapidinho. 💜`,
                     `Claro ${nome}! Para liberar a simulação e tirar todas as suas dúvidas, preciso rodar a pré-análise: nome completo, CPF e data de nascimento. Com esses dados já verifico sua aprovação. 💜`,
                     `${nome} só falta a pré-análise! Envie nome completo, CPF e data de nascimento e destravo sua aprovação rapidinho, aí seguimos com todos os detalhes. 💜`
    ]
    const fraseEscolhida = frases[Math.floor(Math.random() * frases.length)];
    return await sendBotMessage(
      sender,fraseEscolhida);
  }
};

// 🔹 Apenas duas funções
const functions = [
  {
    name: "preAprovacao",
    description: "Usuário forneceu nome completo, CPF e data de nascimento.",
    parameters: {
      type: "object",
      properties: {
        pushName: {
          type: "string",
          description: "Nome exibido do usuário no WhatsApp"
        }
      },
      required: ["pushName"]
    }
  },
  {
    name: "naoDeuDados",
    description: "Usuário ainda não enviou os dados necessários."
  }
];

// 🔹 Agente principal
const openAiServicesBoletoDecisao2 = async ({ sender, msgContent = "", pushName = "" }) => {
  try {
    await setUserStage(sender, "open_ai_services_boleto_decisao_2");

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content:  `
          Você é Anna, assistente da Vertex Store.
          
          Sua função é simples: verificar se o cliente mandou *nome completo*, *CPF* e *data de nascimento* — todos na mesma mensagem.
          
          🔎 Regras:
          
          1. Se a mensagem contiver:
             - Um nome (como "Felipe Belmont")
             - Um CPF (como "11485925711" ou "114.859.257-11")
             - Uma data de nascimento (como "16/01/1986" ou "16011986")
          
          ➡️ Chame a função **preAprovacao**.
          
          2. Se qualquer um desses elementos estiver ausente ou incompleto, chame **naoDeuDados**.
          
          ⚠️ Não tente adivinhar ou corrigir dados.
          ⚠️ Ignore frases como "quero comprar", "tem iPhone?", "meu CPF é tal..." se não estiverem os três dados juntos.
          
          Exemplos válidos:
          - "Meu nome é João da Silva, CPF 12345678900, nasci em 02/10/1990"
          - "12345678900 Maria Souza 05091985"
          - "Carlos Mendes - 98765432100 - 01-01-1980"
          
          Exemplos inválidos:
          - "Meu nome é João" → (falta CPF e data)
          - "12345678900" → (falta nome e data)
          - "Tenho interesse em boleto" → (não é dado)
          `
        },
        { role: "user", content: msgContent }
      ],
      functions,
      function_call: "auto",
      temperature: 0
    });

    const toolCall = completion.choices[0]?.message?.function_call;
    if (toolCall) {
      const { name, arguments: argsStr } = toolCall;
      const args = argsStr ? JSON.parse(argsStr) : {};
      if (handlers[name]) {
        return await handlers[name](sender, { ...args, msgContent, pushName });
      }
    }

    // fallback
    return await handlers.naoDeuDados(sender);
  } catch (err) {
    console.error("❌ Erro no openAiServicesBoletoDecisao2:", err);
    return await sendBotMessage(sender, "⚠️ Tive um problema ao processar seus dados. Pode repetir por favor?");
  }
};

module.exports = { openAiServicesBoletoDecisao2 };
