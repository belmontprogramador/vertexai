const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  getChosenModel,
  getIntencaoDeUso
} = require("../../../redisService");

const { rotinaDeFechamento } = require("../../GerenciadorDeFechamento/rotinaDeFechamento");

const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const functions = [
  {
    name: "fecharVenda",
    description: "Chama o agente de fechamento quando o cliente quiser comprar ou agendar.",
    parameters: {
      type: "object",
      properties: {
        confirmacao: {
          type: "string",
          description: "Confirmação de intenção do cliente em comprar ou agendar"
        }
      },
      required: ["confirmacao"]
    }
  }
];

const handlers = {
  fecharVenda: async (sender, args, extras) => {
    const { modeloEscolhido, finalidade, investimento, pushName, msgContent } = extras;
    await sendBotMessage(sender, `🎯 Perfeito! Vamos agendar agora sua visita para garantir seu ${modeloEscolhido}.`);
    return await rotinaDeFechamento({
      sender,
      msgContent,
      produto: modeloEscolhido,
      finalidadeUso: finalidade,
      investimento,
      pushName
    });
  }
};

const agenteDeDemonstracaoDetalhada = async ({ sender, pushName, msgContent }) => {
  await setUserStage(sender, "agente_de_demonstração_detalhado");

  // 📦 Usa o último modelo escolhido como base de resposta
  const modeloEscolhido = await getChosenModel(sender);
  const intencaoDeUso = await getIntencaoDeUso(sender)
  console.log("📦 [DEBUG] Modelo resgatado do Redis (modelo_escolhido):", modeloEscolhido);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `
Você é Anna, especialista da VertexStore.

⚠️ O cliente escolheu o modelo: "${modeloEscolhido}". Este é o único modelo em foco. O cliente pode fazer perguntas, demonstrar interesse ou objeções sobre ele.
⚠️ O cliente tem a intenção de uso:"${intencaoDeUso}". Voce deve sempre responder as perguntas focado na intenção de uso do cliente, fazendouma aproxima emocional para compra.
Sua missão:
1. Responda sempre com base no modelo "${modeloEscolhido}".
2. Trate novas mensagens como dúvidas sobre esse modelo, mesmo que venham incompletas.
3. Nunca trate partes da mensagem como se fossem um novo modelo.
4. Dê respostas objetivas, com linguagem empática e voltada para usabilidade real.
5. Não ofereça outros modelos, nem mude o modelo atual.
6. Finalize sempre com uma pergunta de fechamento como:
👉 *Quer agendar uma visita pra garantir o seu?*

⚠️ Se o cliente disser algo como "quero", "vou querer", "quero agendar", chame a função "fecharVenda".`
        },
        {
          role: "user",
          content: msgContent
        }
      ],
      functions,
      function_call: "auto",
      temperature: 0.7,
      max_tokens: 300
    });

    const choice = completion.choices[0];

    if (choice.finish_reason === "function_call" && choice.message.function_call) {
      const funcName = choice.message.function_call.name;
      const args = JSON.parse(choice.message.function_call.arguments || "{}");

      if (handlers[funcName]) {
        return await handlers[funcName](sender, args, {
          modeloEscolhido,        
          pushName,
          msgContent
        });
      }
    }

    const resposta = choice.message.content;
    await sendBotMessage(sender, resposta || "❌ Desculpe, não entendi sua pergunta. Pode repetir?");
  } catch (err) {
    console.error("❌ Erro no agente de demonstração detalhada:", err);
    await sendBotMessage(sender, "❌ Tive um problema ao continuar a demonstração. Pode tentar de novo?");
  }
};

module.exports = { agenteDeDemonstracaoDetalhada };
