const { sendBotMessage } = require("../../../messageSender");
const { setUserStage, getNomeUsuario } = require("../../../redisService");
const OpenAI = require("openai");

require("dotenv").config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const { estaBloqueado, setBloqueio } = require("../../../utils/filaDeMensagem/bloqueioTemporario");


// 🔹 Handlers
const handlers = {
  preAprovacao: async (sender, args) => {
    const { pushName } = args;
  
    await setUserStage(sender, "open_ai_services_duvidas_boleto");
    const nome = await getNomeUsuario(sender);
    // await sendBotMessage (sender, `${nome} aguarda um minutinho que eu vou verificar e ja volto aqui`)

    setBloqueio(sender);

  
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    await delay(100); // ⏳ Espera 20 segundos
  
    const frases = [`🔥 Corre na loja, ${nome}! 🚀 Sua análise bateu aprovação altíssima. ⏰ Que horário você consegue chegar? Ou voce gostaria de tirar duvidas sobre modelos ou financiamento?💜`,
                    `🚀 Corre na loja, ${nome}! 🤩 Chegou agora: grau de aprovação lá em cima. 🕒 Quando pode vir?Ou voce gostaria de tirar duvidas sobre modelos ou financiamento?💜`,
                  `🔥Corre na loja, ${nome}! 🔥 Cadastro liberado com alta aprovação. 🗓 Qual horário fica melhor pra você hoje? Ou voce gostaria de tirar duvidas sobre modelos ou financiamento?💜`
    ]
    const fraseEscolhida = frases[Math.floor(Math.random() * frases.length)];
    return await sendBotMessage(sender,fraseEscolhida);
  },
  naoDeuDados: async (sender) => {
    await setUserStage(sender, "open_ai_services_boleto_decisao_2");
    const nome = await getNomeUsuario(sender);   
    const frases = [`${nome} para avançar já com valores e condições, preciso fazer uma pré‑análise: nome completo, CPF e endereço. Com isso, libero sua aprovação rapidinho. 💜`,
                     `Claro ${nome}! Para liberar a simulação e tirar todas as suas dúvidas, preciso rodar a pré-análise: nome completo, CPF e endereço. Com esses dados já verifico sua aprovação. 💜`,
                     `${nome} só falta a pré-análise! Envie nome completo, CPF e endereço e destravo sua aprovação rapidinho, aí seguimos com todos os detalhes. 💜`
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
    description: "Usuário forneceu nome completo, CPF e/ou /data de nascimento. Nome e cpf precisam conter. Data de nascimento e endereço pode conter um ou outro.",
    parameters: {
      type: "object",
      properties: {
        pushName: {
          type: "string",
          description: "Se conter nome e CPF esta autorizado a chamar a função"
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
  if (estaBloqueado(sender)) {
    console.log(`⏳ Ignorando mensagem de ${sender} ainda em período de bloqueio.`);
    return;
  }
  
  // Dentro de preAprovacao:
  setBloqueio(sender); // ativa bloqueio
  try {
    await setUserStage(sender, "open_ai_services_boleto_decisao_2");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:  `
          Você é Anna, assistente da Vertex Store.
          
          Sua função é simples: verificar se o cliente mandou *nome completo*, *CPF* e *endereço* — todos na mesma mensagem.
          
          🔎 Regras:
          
          1. Se a mensagem contiver:
             - Um nome (como "Felipe Belmont")
             - Um CPF (como "11485925711" ou "114.859.257-11")
             - Um endereço (como "Rua das Neves - 360 - bairro")
          
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
          - "12345678900" → (falta nome e endereço)
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
