const { sendBotMessage } = require("../../../messageSender");
const { 
  setUserStage,  
  getHistoricoFormatadoParaPrompt,   
} = require("../../../redisService");
const { rotinaDeSondagemDeCelular } = require("../../GerenciadorDeSondagem/rotinaDeSondagemDeCelular");
const { rotinaDeSondagemDeAcessorios } = require("../../GerenciadorDeSondagem/rotinaDeSondagemAcessorios");
const { rotinaDeDemonstracaoPorNome } = require("../../GerenciadordeDemonstracao/rotinaDeDemonstracaoPorNome");
const { rotinaDeBoleto } = require("../../GerenciadordeBoleto/rotinaDeBoleto")
const { rotinaDeSuporte } = require("../../GerenciadorDeSuporte/rotinaDeSuporte")

const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔹 Funções para lidar com cada categoria de interesse
const handlers = {
  consultarCelulares: async (sender, msgContent, pushName) => {
    await setUserStage(sender, "sondagem_de_celular");
    await rotinaDeSondagemDeCelular({ sender, msgContent, pushName });
  },
  demonstrarCelular: async (sender, msgContent, pushName, args = {}) => {
    await setUserStage(sender, "sequencia_de_demonstracao_por_nome");
  
    const modeloMencionado = args.termosRelacionados || "modelo não especificado";
  
    await rotinaDeDemonstracaoPorNome({ sender, msgContent, modeloMencionado, pushName });
  },
  consultarParcelamento: async (sender, msgContent, pushName) => {
    await setUserStage(sender, "parcelamento");
    await await sendBotMessage(sender, "voce prefere no cartão ou no boleto?");
  },
  consultarAcessorios: async (sender, msgContent, pushName) => {
    await setUserStage(sender, "sondagem_de_acessorios");
    await rotinaDeSondagemDeAcessorios({ sender, msgContent, pushName });
  },
  consultarBoletos: async (sender, msgContent, pushName) => {
    await setUserStage(sender, "boleto");
    await rotinaDeBoleto({ sender, msgContent, pushName });
  },
  consultarOutros: async (sender, msgContent, pushName) => {
    await setUserStage(sender, "suporte");
    await rotinaDeSuporte({ sender, msgContent, pushName });
  },
 investigarIntencao: async (sender, msgContent, pushName) => {  
  await setUserStage(sender, "sequencia_de_abordagem")
  await sendBotMessage(
    sender,
    `🤔 Entendi que você ainda está decidindo... Só pra te ajudar melhor, você está procurando um celular, acessório ou deseja saber sobre formas de pagamento como parcelamento ou boleto?`
  );
}
};


// 🔹 Definição das funções disponíveis (tools)
const functions = [
  {
    name: "consultarCelulares",
    description: `
  Use esta função quando o usuário demonstrar interesse genérico por celulares sem citar marcas ou modelos. 
  Exemplos: 'quero ver celular', 'tem celular aí?', 'queria ver um celular', 'me mostra os celulares', '1', 'opção 1', 'quero comprar celular'.
  Não use esta função se o usuário disser 'iPhone 13', 'Samsung', 'Xiaomi', ou qualquer modelo/marca específica.
  `,
    parameters: {
      type: "object",
      properties: {
        interesse: { type: "string", enum: ["celulares"] },
        termosRelacionados: {
          type: "string",
          description: "Palavras genéricas como: celular, ver celular, modelo bom, comprar celular, 1, opção 1."
        }
      },
      required: ["interesse"]
    }
  },  
  {
    name: "demonstrarCelular",
    description: "Quando o usuário menciona marcas ou modelos específicos de celular, como 'iPhone 13', 'Samsung A23', 'Motorola', 'POCO X6 Pro', 'realme C55' e deseja ver detalhes do produto. ⚠️ Se o usuário também falar sobre formas de pagamento, a prioridade deve ser da função 'consultarParcelamento'.",
    parameters: {
      type: "object",
      properties: {
        interesse: { type: "string", enum: ["demonstracao"] },
        termosRelacionados: {
          type: "string",
          description: "Modelo ou marca mencionada pelo usuário como: iPhone, Samsung, A23, Xiaomi, Motorola, Redmi Note 13, POCO X6 Pro, realme C55, realme 11 Pro+."
        }
      },
      required: ["interesse"]
    }
  },
  {
    name: "consultarParcelamento",
    description: "Quando o usuário fala sobre formas de pagamento como crediário, parcelamento, 'em quantas vezes', 'parcelar no boleto' ou 'tenho nome sujo, consigo comprar?'. ✅ Essa função sempre tem prioridade se o usuário mencionar também um modelo de celular na mesma frase.",
    parameters: {
      type: "object",
      properties: {
        interesse: { type: "string", enum: ["parcelamento"] },
        termosRelacionados: {
          type: "string",
          description: "Termos mencionados pelo usuário como: boleto, crediário, nome sujo, formas de pagamento, parcelado"
        }
      },
      required: ["interesse"]
    }
  },
  { 
    name: "consultarAcessorios", 
    description: "Usuário interessado em acessórios.", 
    parameters: { 
      type: "object", 
      properties: { 
        interesse: { type: "string", enum: ["acessorios"] } 
      }, 
      required: ["interesse"] 
    } 
  },
  { 
    name: "consultarOutros", 
    description: "Usuário menciona algo fora das categorias definidas.", 
    parameters: { 
      type: "object", 
      properties: { 
        interesse: { type: "string", enum: ["outros"] } 
      }, 
      required: ["interesse"] 
    } 
  },
  {
    name: "investigarIntencao",
    description: `Use esta função quando a mensagem do usuário estiver vaga, ambígua ou evasiva, sem fornecer informações claras o suficiente para decidir se ele deseja ver celulares, acessórios, formas de pagamento, boletos ou suporte, uma marca ou modelo especifico.
  
  Assim que a resposta posterior do usuário estiver clara, a IA deve então redirecionar para a função apropriada (consultarCelulares, demonstrarCelular, consultarParcelamento, etc.).
  
  ⚠️ **Importante**: esta função **não deve ser usada** se o usuário der qualquer indício claro de:
  - Marca ou modelo de celular (ex: “iPhone 11”)
  - Forma de pagamento (ex: “parcelado”, “boleto”)
  - Produto específico (ex: “capa”, “fone”, “carregador”)
  
  Neste caso, utilize diretamente a função correspondente.`,
    parameters: {
      type: "object",
      properties: {
        interesse: { type: "string", enum: ["investigar"] }
      },
      required: ["interesse"]
    }
  }  
];

// 🔹 Função principal para rodar o agente de sondagem
const agenteDeDefiniçãoDeSondagem = async (sender, msgContent, pushName) => {
  // Recupera as últimas 3 mensagens já formatadas para o prompt
  const historicoFormatado = await getHistoricoFormatadoParaPrompt(sender, 3);

  try {
    // Monta o array de mensagens com o prompt detalhado
    const mensagensGPT = [
      {
        role: "system",
        content: `Você é Anna, assistente virtual da VertexStore. Sua tarefa é identificar com clareza a intenção do usuário com base nas últimas três mensagens do histórico e na mensagem atual. 

Regras para o caso de celulares:
1. Se o usuário digitar apenas "1" ou mencionar apenas a palavra "celular" sem especificar modelo ou marca, leve-o para a rotina de sondagem de celular correspondente à função 'consultarCelulares'.
2. Se o usuário mencionar um modelo ou uma marca de celular (por exemplo, "iPhone", "Samsung", "Motorola"), leve-o diretamente para a rotina de demonstração correspondente à função 'demonstrarCelular'.
3. Se o usuário falar algo relacionado a crediário, boleto ou parcelamento, interprete como dúvida sobre modos de parcelamento e direcione para a rotina de parcelamento correspondente à função 'consultarParcelamento'.
4. Se vier uma resposta ambígua tipo 'Vocês têm o POCO X6 no boleto' ou 'quero um iPhone no crediário', você deve sempre optar pela função 'consultarParcelamento'.

⚠️ Atenção: Só use a função 'investigarIntencao' se a mensagem estiver vaga como "tô vendo ainda", "qualquer coisa", "não sei".  
Se o usuário disser claramente uma marca ou modelo (ex: “quero um celular Motorola”), use diretamente 'demonstrarCelular'.
‼️ Priorize sempre decisões diretas. Só investigue se realmente não for possível identificar nenhuma categoria clara.


Analise o contexto das últimas três mensagens juntamente com a mensagem atual, e responda apenas com a indicação de qual função chamar e, se necessário, preencha os parâmetros correspondentes.`
      },
      ...historicoFormatado,
      {
        role: "user",
        content: msgContent
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: mensagensGPT,
      functions,
      function_call: "auto",
      temperature: 0.7
    });

    const response = completion.choices[0];

    if (response.finish_reason === "function_call") {
      const functionName = response.message.function_call.name;
      const args = JSON.parse(response.message.function_call.arguments || "{}");

      if (handlers[functionName]) {
        await handlers[functionName](sender, msgContent, pushName, args);
      } else {
        await sendBotMessage(sender, "❌ Desculpe, não consegui identificar sua solicitação.");
      }
    } else {
      // fallback: se a IA não gerou uma função, assume intenção indefinida
      await handlers["investigarIntencao"](sender, msgContent, pushName);
    }
  } catch (error) {
    console.error("Erro no agente de sondagem:", error);
    await sendBotMessage(sender, "❌ Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.");
  }
};

module.exports = { agenteDeDefiniçãoDeSondagem };
