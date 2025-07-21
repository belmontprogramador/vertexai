const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  storeNomeUsuario,
} = require("../../../redisService");

const { atualizarNomeLeadPorTelefone } = require("../../../ServicesKommo/atualizarNomeDoLead");
const { adicionarOuCriarTagPorDataAtual } = require("../../../ServicesKommo/criarOuAdicionarTagDataAtual");
const { rotinaDeDemonstracaoDeCelularPorValor } = require("../PorValor/rotinaDeDemonstracaoDeCelularPorValor");

const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔹 Funções para lidar com os caminhos da decisão
const handlers = {
  salvar_nome_usuario: async (sender, args, extras) => {
    const { msgContent, pushName } = extras;
    const nome = args.nome;

    await storeNomeUsuario(sender, nome);
    await setUserStage(sender, "rotina_de_demonstracao_de_celular_por_valor");

    try {
      const leadId = await atualizarNomeLeadPorTelefone(sender, nome);
      if (leadId) {
        console.log(`✅ Nome atualizado no Kommo para lead ${leadId}`);
        await adicionarOuCriarTagPorDataAtual(leadId);
        console.log(`🏷️ Tag de mês/ano adicionada ao lead ${leadId}`);
      } else {
        console.warn("⚠️ Lead não encontrado no Kommo.");
      }
    } catch (err) {
      console.warn("⚠️ Erro ao atualizar nome ou adicionar tag:", err.message);
    }

    return await rotinaDeDemonstracaoDeCelularPorValor({ sender, msgContent, pushName: nome });
  },

  pedir_nome_novamente: async (sender) => {
    await setUserStage(sender, "agente_de_identificacao_de_nome_para_trafego");
    const frases = [
      `A gente adora atender bem, e seu nome é fundamental pra isso. Como devo te chamar? 💜`,
      `Compartilha seu nome com a gente? Assim ajustamos tudo pra te atender do seu jeito 💜`,
      `Qual é o seu primeiro nome? Vou usar pra te acompanhar melhor 🥰`,
      `Me diz só seu primeiro nome pra gente seguir rapidinho?`,
    ];
    const fraseEscolhida = frases[Math.floor(Math.random() * frases.length)];
    return await sendBotMessage(sender, fraseEscolhida);
  }
};

// 🔹 Definição das funções (tools)
const functions = [
  {
    name: "salvar_nome_usuario",
    description: "Identifica e salva o primeiro nome do usuário.",
    parameters: {
      type: "object",
      properties: {
        nome: {
          type: "string",
          description: "Primeiro nome do usuário"
        }
      },
      required: ["nome"]
    }
  },
  {
    name: "pedir_nome_novamente",
    description: "Pede novamente o nome do usuário se ele não informou."
  }
];

// 🔹 Agente principal
const agenteDeIdentificacaoDeNomeParaTrafego = async ({ sender, msgContent, pushName }) => {
  await setUserStage(sender, "agente_de_identificacao_de_nome_para_trafego");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `
Você é Anna, assistente virtual da Vertex Store.
Você é Anna, assistente da Vertex Store. Seu único objetivo neste momento é identificar o primeiro nome do cliente, mesmo que esteja embutido em uma frase.

⚠️ Regras importantes:

- Aceite nomes **incomuns**, diferentes ou raros, como "Rubens", "Keverson", "Aylana", "Lorrany", "Jucélio", etc, desde que estejam usados de forma clara na frase como identificação do cliente.
Regras:
- Se ele disser o nome isoladamente ou numa frase como "meu nome é João", "sou o Lucas", "me chamo Ana", "aqui é Carlos", chame a função "salvar_nome_usuario" com o nome extraído.
- Se o nome estiver em uma frase, **extraia apenas o primeiro nome**, mesmo que ele diga "meu nome é João da Silva", salve "João".
- Se ele não disser nada que pareça um nome, ou for ambíguo (ex: "quero celular", "oi", "tudo bem"), chame "pedir_nome_novamente".
- Use uma frase diferente a cada interação para identificar o nome.

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

    await sendBotMessage(sender, "🤖 Não consegui entender. Qual é o seu primeiro nome?");
    await setUserStage(sender, "agente_de_identificacao_de_nome_para_trafego");
  } catch (error) {
    console.error("❌ Erro no agenteDeIdentificacaoDeNomeParaTrafego:", error.message);
    await sendBotMessage(sender, "⚠️ Ocorreu um erro ao tentar identificar seu nome. Pode repetir?");
  }
};

module.exports = { agenteDeIdentificacaoDeNomeParaTrafego };
