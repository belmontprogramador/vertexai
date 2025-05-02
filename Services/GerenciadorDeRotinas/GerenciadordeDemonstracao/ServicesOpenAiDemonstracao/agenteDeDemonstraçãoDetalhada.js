const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  getChosenModel,
  getIntencaoDeUso,
  storeHistoricoDeModelosMencionados,
  getHistoricoDeModelosMencionados,
  storeChosenModel
} = require("../../../redisService");

const { rotinaDeFechamento } = require("../../GerenciadorDeFechamento/rotinaDeFechamento");
const OpenAI = require("openai");
const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const REFRESH_TOKEN_PATH = './bling_refresh_token.json';
const CATEGORIA_ID = 11356816;

const getAccessToken = () => {
  if (!fs.existsSync(REFRESH_TOKEN_PATH)) throw new Error('Token Bling não encontrado');
  const data = JSON.parse(fs.readFileSync(REFRESH_TOKEN_PATH, 'utf8'));
  return data.access_token;
};

const obterModelosDoBling = async () => {
  const token = getAccessToken();
  const res = await axios.get("https://www.bling.com.br/Api/v3/produtos", {
    headers: { Authorization: `Bearer ${token}` },
    params: { idCategoria: CATEGORIA_ID, pagina: 1, limite: 100 }
  });
  return res.data.data.map(p => p.nome.trim());
};

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
    return await rotinaDeFechamento({ sender, msgContent, produto: modeloEscolhido, finalidadeUso: finalidade, investimento, pushName });
  }
};

const agenteDeDemonstracaoDetalhada = async ({ sender, pushName, msgContent }) => {
  await setUserStage(sender, "agente_de_demonstração_detalhado");

  let modeloEscolhido = await getChosenModel(sender);
  const intencaoDeUso = await getIntencaoDeUso(sender);
  const historicoModelos = await getHistoricoDeModelosMencionados(sender) || [];

  const modelosDisponiveis = await obterModelosDoBling();
  const modeloDetectado = modelosDisponiveis.find(modelo => msgContent.toLowerCase().includes(modelo.toLowerCase()));

  if (modeloDetectado) {
    modeloEscolhido = modeloDetectado;
    await storeChosenModel(sender, modeloEscolhido);
    if (!historicoModelos.includes(modeloEscolhido)) {
      historicoModelos.push(modeloEscolhido);
      await storeHistoricoDeModelosMencionados(sender, historicoModelos);
    }
  }

  const historicoPrompt = historicoModelos.map((m, i) => `Modelo mencionado #${i + 1}: ${m}`).join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `Você é Anna, especialista da VertexStore.\n
O cliente pode fazer perguntas sobre os modelos que foram mencionados anteriormente na conversa.\n
Seu foco principal é responder dúvidas sobre o modelo atual: "${modeloEscolhido}".\n
Responda de forma objetiva, gentil e clara, e caso o cliente peça comparações, utilize os modelos mencionados no histórico:\n${historicoPrompt}\n
Finalize com: 👉 *Quer agendar uma visita pra garantir o seu?*\n
Se o cliente disser algo como "quero", "vou querer", "quero agendar", chame a função "fecharVenda".`
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
          msgContent,
          intencaoDeUso
        });
      }
    }

    await sendBotMessage(sender, choice.message.content || "❌ Desculpe, não entendi sua pergunta. Pode repetir?");
  } catch (err) {
    console.error("❌ Erro no agente de demonstração detalhada:", err);
    await sendBotMessage(sender, "❌ Tive um problema ao continuar a demonstração. Pode tentar de novo?");
  }
};

module.exports = { agenteDeDemonstracaoDetalhada };
