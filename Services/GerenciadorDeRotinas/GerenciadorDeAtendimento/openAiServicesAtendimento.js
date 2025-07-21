const { sendBotMessage } = require("../../messageSender");
const { 
  setUserStage,
  getNomeUsuario        
} = require("../../redisService");
const { rotinaDeDemonstracaoDeCelularPorValor } = require("../GerenciadorDeDemonstracao/PorValor/rotinaDeDemonstracaoDeCelularPorValor")
const { rotinaDeDemonstracaoDeCelularPorNome } = require("../GerenciadorDeDemonstracao/PorNome/rotinaDeDemonstraçãoDeCelularPorNome") 
const { rotinaDeBoleto } = require("../GerenciadorDeDemonstracao/PorBoleto/rotinaDeBoleto");
const { recepcaoDuvidaGenerica } = require("../GerenciadorDeOutros/recepcaoDuvidaGenerica");

const OpenAI = require("openai");

require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// // 🔹 Funções para lidar com cada categoria de interesse
const handlers = {
  consultarCelulares: async (sender, msgContent, pushName) => {
    await setUserStage(sender, "rotina_de_demonstracao_de_celular_por_valor");
    await rotinaDeDemonstracaoDeCelularPorValor({ sender, msgContent, pushName });
  },
  demonstrarCelular: async (sender, msgContent, pushName, args = {}) => {
    await setUserStage(sender, "rotina_de_demonstracao_de_celular_por_nome");
  
    const fraseCompleta = args.fraseCompleta || msgContent?.termosRelacionados || msgContent;
    const quotedMessage = args.quotedMessage || null; // ← aqui é o fix
  
    await rotinaDeDemonstracaoDeCelularPorNome({
      sender,
      msgContent, 
      quotedMessage,
      pushName
    });
  },  
  consultarParcelamento: async (sender, args, extras) => {
    const { msgContent, pushName } = extras;
const nome = await getNomeUsuario(sender, pushName); 

    await setUserStage(sender, "opena_ai_services_boleto_decisao_1");
    await sendBotMessage(sender, `${nome} me tira uma duvida voce esta procurando parcelamento no boleto ou no cartão?`);
  },   
  seguir_para_boleto: async (sender, args, extras) => {
    const { msgContent, pushName } = extras;
    await setUserStage(sender, "rotina_de_boleto");
    return await rotinaDeBoleto({ sender, msgContent, pushName });
  }, 
//   consultarAcessorios: async (sender, msgContent, pushName) => {
//     await setUserStage(sender, "sondagem_de_acessorios");
//     await rotinaDeSondagemDeAcessorios({ sender, msgContent, pushName });
//   },
//   consultarBoletos: async (sender, msgContent, pushName) => {
//     await setUserStage(sender, "boleto");
//     await rotinaDeBoleto({ sender, msgContent, pushName });
//   },
  consultarOutros: async (sender, msgContent, pushName) => {
    
    await recepcaoDuvidaGenerica({ sender, msgContent, pushName });
  },
//  investigarIntencao: async (sender, msgContent, pushName) => {  
//   await setUserStage(sender, "sequencia_de_abordagem")
//   await sendBotMessage(
//     sender,
//     `🤔 Entendi que você ainda está decidindo... Só pra te ajudar melhor, você está procurando um celular, acessório ou deseja saber sobre formas de pagamento como parcelamento ou boleto?`
//   );
// }
};


// // 🔹 Definição das funções disponíveis (tools)
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
    description: "Quando o usuário menciona marcas ou modelos específicos de celular, como 'iPhone', 'Samsung', 'Motorola', 'POCO, 'poco' ,'Xiaomi', realme' e deseja ver detalhes do produto. ⚠️ Se o usuário também falar sobre formas de pagamento, a prioridade deve ser da função 'consultarParcelamento'.",
    parameters: {
      type: "object",
      properties: {
        interesse: { type: "string", enum: ["demonstracao"] },
        termosRelacionados: {
          type: "string",
          description: "Modelo ou marca mencionada pelo usuário como: iPhone, Samsung, Xiaomi, Motorola, Redmi , POCO, realme."
        }
      },
      required: ["interesse"]
    }
  },
  {
    name: "consultarParcelamento",
    description: "Quando o usuário fala sobre formas de pagamento como crediário, parcelamento, 'em quantas vezes', 'parcelar no boleto' ou 'tenho nome sujo, consigo comprar?' ou digita 2. ✅ Essa função sempre tem prioridade se o usuário mencionar também um modelo de celular na mesma frase.",
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
//   { 
//     name: "consultarAcessorios", 
//     description: "Usuário interessado em acessórios.", 
//     parameters: { 
//       type: "object", 
//       properties: { 
//         interesse: { type: "string", enum: ["acessorios"] } 
//       }, 
//       required: ["interesse"] 
//     } 
//   },
  { 
    name: "consultarOutros", 
    description: "Usuário digita 3.", 
    parameters: { 
      type: "object", 
      properties: { 
        interesse: { type: "string", enum: ["outros"] } 
      }, 
      required: ["interesse"] 
    } 
  },
  // {
  //   name: "investigarIntencao",
  //   description: `Use esta função quando a mensagem do usuário estiver vaga, ambígua ou evasiva, sem fornecer informações claras o suficiente para decidir se ele deseja ver celulares, acessórios, formas de pagamento, boletos ou suporte, uma marca ou modelo especifico.
  
  // Assim que a resposta posterior do usuário estiver clara, a IA deve então redirecionar para a função apropriada (consultarCelulares, demonstrarCelular, consultarParcelamento, etc.).
  
  // ⚠️ **Importante**: esta função **não deve ser usada** se o usuário der qualquer indício claro de:
  // - Marca ou modelo de celular (ex: “iPhone 11”)
  // - Forma de pagamento (ex: “parcelado”, “boleto”)
  // - Produto específico (ex: “capa”, “fone”, “carregador”)
  
  // Neste caso, utilize diretamente a função correspondente.`,
  //   parameters: {
  //     type: "object",
  //     properties: {
  //       interesse: { type: "string", enum: ["investigar"] }
  //     },
  //     required: ["interesse"]
  //   }
  // }  
];

// 🔹 Função principal para rodar o agente de sondagem
const openAiServicesAtendimento = async ({ sender, msgContent, pushName, quotedMessage }) => {
  try {  
    const nome = await getNomeUsuario(sender)   
    // fallback direto para boleto se a mensagem for claramente sobre isso
    if (/\bboleto\b/i.test(msgContent)) {
      return await handlers.seguir_para_boleto(sender, { querBoleto: true }, { msgContent, pushName });
    }   

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `
Você é Anna, assistente da VertexStore. Sua missão é entender a intenção do usuário.

Dado o que o cliente escreveu, identifique qual ação ele deseja:
- "seguir_para_boleto" se ele quer pagar com boleto (ex: "boleto", "boleto parcelado", "pagar no boleto", "sem cartão", etc)
- "consultarParcelamento" se ele quer saber sobre parcelamento, mesmo que não diga a palavra exata. Exemplos: "posso pagar aos poucos?", "consigo dividir?", "tem crediário?", "parcelar em 10x", "em quantas vezes?", "nome sujo, consigo comprar?"
- "consultarCelulares" se ele quer ver celulares, mas sem especificar marca ou modelo.
- "demonstrarCelular" se ele menciona um modelo ou marca específica de celular.

⚠️ Priorize:
- "consultarParcelamento" sempre que houver qualquer sinal de parcelamento, mesmo implícito.
- "seguir_para_boleto" se ele quiser especificamente o boleto, mesmo parcelado.

Responda com a função apropriada e seus parâmetros.
`
        },
        { role: "user", content: msgContent }
      ],
      functions,
      function_call: "auto",
      temperature: 0.7
    });

    console.dir(completion.choices[0], { depth: null });

    const toolCalls = completion.choices[0].message.function_call;
    if (toolCalls) {
      const funcName = toolCalls.name;
      const args = JSON.parse(toolCalls.arguments || "{}");
    
      if (handlers[funcName]) {
        return await handlers[funcName](sender, msgContent, pushName, {
          ...args,
          fraseCompleta: msgContent,
          quotedMessage 
        });
        
      }
    }
    
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    await delay(2000);
    await sendBotMessage(sender,  `Oi ${nome} nesse momento inicial preciso que você me dê informações basicas para eu te ajudar.` );
    await delay(1000);
    await sendBotMessage(sender,  `Escolha uma opção do menu abaixo para eu te ajudar` );
    const menu = `Escolha seu clique 💜👇
    1️⃣ Smartphones – lançamentos e custo-benefício top 🔥
    2️⃣Pagamento Fácil – Boleto Vertex até 18X 💸
    3️⃣ Outros Assuntos - Acessorios e Duvidas
     `
     await delay(1000);
     await sendBotMessage(sender, menu);
  } catch (err) {
    console.error("❌ Erro no agente de decisão boleto/sondagem:", err);
    await sendBotMessage(sender, "⚠️ Ocorreu um erro ao tentar entender sua resposta. Pode tentar novamente?");
  }
};

module.exports = { openAiServicesAtendimento };



 

 