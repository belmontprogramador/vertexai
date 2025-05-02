const { sendBotMessage } = require("../../../messageSender");
const { setUserStage, storeChosenModel } = require("../../../redisService");
const { hallDeboletosModelos } = require("../../GerenciadordeDemonstracao/ServicesOpenAiDemonstracao/hallDeboletosModelos");
const { rotinaDeAgendamento } = require("../../GerenciamentoDeAgendamento/rotinaDeAgendamento");
const { openAiAgenteDuvidasBoleto } = require("./openAiAgenteDuvidasBoleto");
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const handlers = {
  tirarDuvidas: async (sender, args) => {
    const { msgContent, pushName } = args;
    await setUserStage(sender, "boleto_agente_duvidas");
    return await openAiAgenteDuvidasBoleto({ sender, msgContent, pushName });
  },

  preAprovacao: async (sender, args) => {
    const { pushName } = args;
    await setUserStage(sender, "boleto_agente");
    return await sendBotMessage(
      sender,
      `✅ ${pushName}, com seus dados conseguimos uma pré-aprovação de 90%! Lembrando que toda analise definitiva é feito em loja! Gostaria de agendar uma visita para realizar sua nalise definitiva ou tirar mais dúvidas?`
    );
  },
  agendarVisita: async (sender, args) => {
    const { msgContent, pushName } = args;
    await setUserStage(sender, "agendamento");
    await sendBotMessage(sender, `📅 Perfeito, ${pushName}! Vamos agendar sua visita.`);
    return await rotinaDeAgendamento({ sender, msgContent, pushName });
  },
  identificarModelo: async (sender, args) => {
    const { content, pushName } = args;
  
    // Armazena o modelo digitado pelo usuário
    await storeChosenModel(sender, content);
  
    // Define o stage para buscar o modelo corretamente
    await setUserStage(sender, "hall_de_boletos_modelos");
  
    await sendBotMessage(
      sender,
      `📱 Entendi, ${pushName}! Vou identificar o modelo que você deseja. Aguarde só um momento...`
    );
  
    
    return await hallDeboletosModelos({ sender, msgContent: content, pushName });
  }
  
};

const functions = [
  {
    name: "tirarDuvidas",
    description: "Encaminha para agente especializado em responder dúvidas sobre a PayJoy.",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string", description: "Texto da dúvida do usuário." }
      },
      required: ["content"]
    }
  },
  {
    name: "preAprovacao",
    description: "Informa que o cliente foi pré-aprovado e pergunta se ele quer agendar ou tirar dúvidas."
  },
  {
    name: "agendarVisita",
    description: "Inicia a rotina de agendamento da visita."
  },
  {
    name: "identificarModelo",
    description: "Usuário mencionou interesse em um modelo de celular. Deve salvar a informação e iniciar processo de identificação.",
    parameters: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "Mensagem original do usuário com o nome ou características do modelo."
        }
      },
      required: ["content"]
    }
  }
];

const openAiServicesBoleto = async ({ sender, msgContent = "", pushName = "" }) => {
  try {
    const userMessage = msgContent?.trim() || "Quero saber sobre boleto parcelado.";
    await setUserStage(sender, "boleto_agente");

    const messages = [
      {
        role: "system",
        content: `
    Você é um agente decisor da VertexStore. Sua única função é identificar o que o usuário deseja com base na mensagem:
    
    1️⃣ Se o usuário mandar nome, CPF e data de nascimento → chame **preAprovacao**
    2️⃣ Se perguntar algo sobre financiamento, parcelas, bloqueio, juros, disser que tem dúvidas → chame **tirarDuvidas**
    3️⃣ Se disser claramente que quer agendar → chame **agendarVisita**
    4️⃣ Se perguntar por modelos de celular, como "quais modelos tem?", "qual celular posso pegar?", "me mostra os modelos?" → chame **identificarModelo**
    
    Nunca responda diretamente. Apenas escolha a função correta.
    `
      },
      { role: "user", content: userMessage }
    ];
    

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages,
      functions,
      function_call: "auto",
      temperature: 0.3
    });

    const response = completion.choices[0];

    if (response.finish_reason === "function_call" && response.message.function_call) {
      const { name: functionName, arguments: argsString } = response.message.function_call;
      const args = argsString ? JSON.parse(argsString) : {};

      if (handlers[functionName]) {
        return await handlers[functionName](sender, { ...args, msgContent, pushName });
      }
    }

    return await sendBotMessage(sender, "❌ Não consegui identificar se você quer tirar dúvidas ou agendar. Pode repetir?");
  } catch (error) {
    console.error("❌ Erro no agente decisor de boleto:", error);
    return await sendBotMessage(sender, "❌ Erro ao processar sua solicitação sobre boleto. Tente novamente mais tarde.");
  }
};

module.exports = { openAiServicesBoleto };