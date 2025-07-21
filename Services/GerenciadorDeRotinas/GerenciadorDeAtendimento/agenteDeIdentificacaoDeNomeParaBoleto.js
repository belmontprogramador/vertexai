const { sendBotMessage } = require("../../messageSender");
const {
  setUserStage,
  storeNomeUsuario
} = require("../../redisService");

const { atualizarNomeLeadPorTelefone } = require("../../ServicesKommo/atualizarNomeDoLead");
const { adicionarOuCriarTagPorDataAtual } = require("../../ServicesKommo/criarOuAdicionarTagDataAtual");
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

    try {
      const leadId = await atualizarNomeLeadPorTelefone(sender, nome);
      if (leadId) {
        console.log(`🚀 Atualizado nome no Kommo. Lead ID: ${leadId}`);
        await adicionarOuCriarTagPorDataAtual(leadId);
        console.log(`✅ Tag de mês/ano adicionada para o lead ${leadId}`);
      } else {
        console.warn("⚠️ Lead não encontrado no Kommo para atualizar nome.");
      }
    } catch (err) {
      console.warn("⚠️ Falha ao atualizar nome ou tag no Kommo:", err.message);
    }

    return await rotinaDeBoleto({ sender, msgContent, pushName: nome });
  },

  pedir_nome_novamente: async (sender) => {
    await setUserStage(sender, "agente_de_identificacao_de_nome_para_boleto");
    const frases = [
      `A gente adora atender bem, e seu nome é fundamental pra isso. Como devo te chamar? 💜`,
      `Compartilha seu nome com a gente? Assim ajustamos tudo pra te atender do seu jeito 💜`
    ];
    const fraseEscolhida = frases[Math.floor(Math.random() * frases.length)];
    return await sendBotMessage(sender, fraseEscolhida);
  }
};

// 🔹 Definição das funções (tools)
const functions = [
  {
    name: "salvar_nome_usuario",
    description: "Identifica o nome do cliente e armazena.",
    parameters: {
      type: "object",
      properties: {
        nome: {
          type: "string",
          description: "Primeiro nome do cliente"
        }
      },
      required: ["nome"]
    }
  },
  {
    name: "pedir_nome_novamente",
    description: "Usuário ainda não informou o nome, então pede novamente"
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
Você é Anna, assistente da Vertex Store. Seu único objetivo neste momento é identificar o primeiro nome do cliente, mesmo que esteja embutido em uma frase.

⚠️ Regras importantes:

- Aceite nomes **incomuns**, diferentes ou raros, como "Rubens", "Keverson", "Aylana", "Lorrany", "Jucélio", etc, desde que estejam usados de forma clara na frase como identificação do cliente.
📌 Regras:
- Se o cliente disser "sou o João", "aqui é a Ana", "me chamo Felipe", etc., chame a função salvar_nome_usuario com o primeiro nome.
- Ignore sobrenomes, emojis, números e saudações.
- Caso a entrada seja genérica ("oi", "quero ajuda", "me atende"), chame pedir_nome_novamente.
- Nunca invente nomes.
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
    await setUserStage(sender, "agente_de_identificacao_de_nome_para_boleto");
    return await sendBotMessage(sender, "🤖 Não consegui entender. Qual é o seu primeiro nome?");
  } catch (error) {
    console.error("❌ Erro no agenteDeIdentificacaoDeNomeParaBoleto:", error.message);
    await sendBotMessage(sender, "⚠️ Ocorreu um erro ao tentar identificar seu nome. Pode repetir?");
  }
};

module.exports = { agenteDeIdentificacaoDeNomeParaBoleto };
