const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  getChosenModel
} = require("../../../redisService");

const { agenteDeDemonstracaoDetalhada } = require("./agenteDeDemonstraçãoDetalhada");
const { rotinaDeSondagemDeCelular } = require("../../GerenciadorDeSondagem/rotinaDeSondagemDeCelular");

const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔧 Function declarada conforme padrão correto
const functions = [
    {
      type: "function",
      function: {
        name: "confirmar_desejo_modelo",
        description: "Chama esta função se o cliente demonstrar interesse em seguir com o modelo atual e quiser mais detalhes, tirar dúvidas, fizer uma pergunta direta sobre o modelo ou fechar a compra.",
        parameters: {
          type: "object",
          properties: {
            querModelo: {
              type: "boolean",
              description: "Indica se o cliente está interessado em continuar com o modelo atual, com falas como 'quero tirar duvida' ou fazer uma pergunta direta sobre o modelo escolhido"
            }
          },
          required: ["querModelo"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "mostrar_novos_modelos",
        description: "Chama esta função se o cliente demonstrar que quer ver outras opções, não gostou do modelo atual ou quiser comparar com outros celulares.",
        parameters: {
          type: "object",
          properties: {
            querModelo: {
              type: "boolean",
              description: "Indica se o cliente quer abandonar o modelo atual e ver outras opções"
            }
          },
          required: ["querModelo"]
        }
      }
    }
  ];
  

// 🎯 Handlers das funções
const handlers = {
    confirmar_desejo_modelo: async (sender, args, extras) => {
      const { msgContent, pushName } = extras;
  
      if (args.querModelo) {
        await setUserStage(sender, "agente_de_demonstração_detalhada");
        return await agenteDeDemonstracaoDetalhada({ sender, msgContent, pushName });
      } else {
        await setUserStage(sender, "sondagem_de_celular");
        return await rotinaDeSondagemDeCelular({ sender, msgContent, pushName });
      }
    },
  
    mostrar_novos_modelos: async (sender, args, extras) => {
      const { msgContent, pushName } = extras;
  
      // Mesmo que "querModelo" seja false ou true, ele quer ver novas opções.
      await setUserStage(sender, "sondagem_de_celular");
      return await rotinaDeSondagemDeCelular({ sender, msgContent, pushName });
    }
  };

// 🤖 Agente principal
const agenteDeDecisao = async ({ sender, msgContent, pushName }) => {
  const modeloEscolhido = await getChosenModel(sender);
  if (!modeloEscolhido) {
    await sendBotMessage(sender, "❌ Não encontrei o modelo salvo. Pode informar novamente?");
    return;
  }

  await setUserStage(sender, "agente_de_decisao");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: `
Você é a Anna, especialista da VertexStore.

O usuário acabou de receber uma explicação sobre o modelo "${modeloEscolhido}".
Com base na resposta do cliente ("${msgContent}"), identifique se ele quer continuar com esse modelo ou não.

Responda com clareza e use as funções disponíveis para tomar a decisão automaticamente.
`
        },
        { role: "user", content: msgContent }
      ],
      tools: functions,
      tool_choice: "auto"
    });

    const choice = completion.choices[0];

    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls?.[0]) {
      const toolCall = choice.message.tool_calls[0];
      const funcName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments || "{}");

      if (handlers[funcName]) {
        return await handlers[funcName](sender, args, {
          msgContent,
          pushName
        });
      }
    }

    const resposta = choice.message.content;
    await sendBotMessage(sender, resposta || "🤖 Não entendi sua resposta. Você quer seguir com esse modelo ou ver outros?");
  } catch (err) {
    console.error("❌ Erro no agente de decisão:", err);
    await sendBotMessage(sender, "⚠️ Ocorreu um erro ao tentar entender sua resposta. Pode tentar novamente?");
  }
};

module.exports = { agenteDeDecisao };
