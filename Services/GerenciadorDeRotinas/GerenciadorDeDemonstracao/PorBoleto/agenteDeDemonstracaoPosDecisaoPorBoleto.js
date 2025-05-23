const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  appendToConversation,
  getConversation,
  getNomeUsuario,
  getUserStage
} = require("../../../redisService");
 
const { agenteDeDemonstracaoPorNomePorBoleto } = require("./agenteDeDemonstracaoPorNomePorBoleto");
const { objeçõesVertex } = require("../../../utils/objecoes");
const { gatilhosEmocionaisVertex } = require('../../../utils/gatilhosEmocionais');
const { tomDeVozVertex } = require('../../../utils/tomDeVozVertex');
const { rotinaDeAgendamento } = require("../../GerenciadorDeAgendamento/rotinaDeAgendamento");

const { getAllCelulares } = require('../../../dbService')

const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const agenteDeDemonstracaoPosDecisaoPorBoleto = async ({ sender, msgContent, pushName }) => {
  try {
    const entrada = typeof msgContent === "string" ? msgContent : msgContent?.termosRelacionados || "";
    await appendToConversation(sender, entrada);
    const nome = await getNomeUsuario(sender);
    const conversa = await getConversation(sender);
    const conversaCompleta = conversa.slice(-10).join(" | ");

    const modelosRecentes = conversa
      .filter(m => m.startsWith("modelo_sugerido_json:") || m.startsWith("modelo_sugerido:"))
      .map(m => {
        if (m.startsWith("modelo_sugerido_json:")) {
          try {
            return JSON.parse(m.replace("modelo_sugerido_json: ", ""));
          } catch {
            return null;
          }
        }
        const nome = m.replace("modelo_sugerido: ", "").trim();
        return {
          nome,
          descricaoCurta: "(descrição não disponível)",
          preco: "preço não informado"
        };
      })
      .filter(Boolean);

    const listaFormatada = modelosRecentes.map(m => `- ${m.nome}: ${m.descricaoCurta} (R$ ${m.preco})`).join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `🤖 Você é Anna, assistente virtual da Vertex Store.
          O cliente já viu modelos de celular. Agora ele pode:
          
          1. Escolher um modelo final → demonstracaoDetalhada
          2. Fazer pergunta sobre os modelos sugeridos → responderDuvida
          3. Mencionar novo modelo ou mudar de ideia → identificarModeloPorNome
          
          ══════════ MODELOS JÁ APRESENTADOS ══════════
          ${modelosRecentes.map(m => `- ${m.nome}`).join("\n") || "(nenhum modelo encontrado)"}
          
          ══════════ DECISÃO IMPORTANTE ══════════
          
          ⚠️ Se o cliente mencionar QUALQUER outro modelo, marca ou número que não está na lista acima — mesmo que seja da mesma linha ou marca (ex: "REALME C67" depois de "REALME C75") — então:
          
          → Chame **identificarModeloPorNome**
          
          ⚠️ Exemplos que devem ACIONAR identificarModeloPorNome:
          - "tem redmi note 13?"
          - "me mostra o realme c67"
          - "qual o preço do poco x7 5g?"
          - "e o note 14?"
          
          Só chame responderDuvida se estiver **claramente falando sobre os modelos listados acima** (ex: “qual deles tem melhor câmera?”, “qual desses tem mais bateria?”, “me fala mais do realme c75”).
          
          ══════════ CONTEXTO DO CLIENTE ══════════
          Histórico da conversa:
          ${conversaCompleta}`
          },
        { role: "user", content: entrada }
      ],
      functions,
      function_call: "auto"
    });

    const toolCall = completion.choices[0]?.message?.function_call;

    // fallback obrigatório para manter loop em dúvida
    if (!toolCall) {
      return await handlers.responderDuvida(sender, {}, { msgContent: entrada, pushName, conversaCompleta });
    }

    const { name, arguments: argsStr } = toolCall;
    const args = argsStr ? JSON.parse(argsStr) : {};

    if (handlers[name]) {
      return await handlers[name](sender, args, { msgContent: entrada, pushName, conversaCompleta });
    }

    console.warn(`⚠️ Função não reconhecida: ${name}`);
    return await sendBotMessage(sender, "⚠️ Não entendi sua escolha. Pode repetir?");
  } catch (error) {
    console.error("❌ Erro no identificarModeloPorNomePosDemonstração:", error);
    return await sendBotMessage(sender, "⚠️ Ocorreu um erro. Pode tentar de novo?");
  }
};

const handlers = {
  demonstracaoDetalhada: async (sender, args, extras) => {
    await setUserStage(sender, "agente_de_demonstração_detalhada");
    const novoStage = await getUserStage(sender);
    await sendBotMessage(sender, novoStage);
    return await  rotinaDeAgendamento ({
      sender,
      msgContent: extras.msgContent,
      pushName: extras.pushName,
      modeloMencionado: args.modeloMencionado
    });
  },
  responderDuvida: async (sender, _args, extras) => {
    await setUserStage(sender, "agente_de_demonstracao_pos_decisao_por_boleto");

    const historico = await getConversation(sender);
    const conversaCompleta = historico.map(f => f.replace(/^again\s*/i, "").trim()).slice(-10).join(" | ");
  
    // Carrega todos os modelos disponíveis do banco (com descrição completa)
    const modelosBanco = await getAllCelulares();

    const nome = await getNomeUsuario(sender);
  
    // Extrai nomes do histórico (modelo_sugerido_json ou modelo_sugerido)
    const nomesHistorico = historico
      .filter(m => m.startsWith("modelo_sugerido_json:") || m.startsWith("modelo_sugerido:"))
      .map(m => {
        if (m.startsWith("modelo_sugerido_json:")) {
          try {
            const obj = JSON.parse(m.replace("modelo_sugerido_json: ", ""));
            return obj.nome;
          } catch {
            return null;
          }
        }
        return m.replace("modelo_sugerido: ", "").trim();
      })
      .filter(Boolean);
  
    // Filtra os modelos do banco que estão no histórico
    const modelos = modelosBanco.filter(m =>
      nomesHistorico.some(n => n.toLowerCase() === m.nome.toLowerCase())
    );
  
    if (modelos.length === 0) {
      return await sendBotMessage(sender, "⚠️ Ainda não te mostrei nenhum modelo pra comparar. Quer ver algumas opções?");
    }
    const contexto = `
    Você é Anna, especialista da Vertex Store.
    
    Siga exatamente as diretrizes abaixo para responder qualquer cliente:
    
    TOM DE VOZ:
    ${JSON.stringify(tomDeVozVertex, null, 2)}
    
    OBJEÇÕES COMUNS:
    ${JSON.stringify(objeçõesVertex, null, 2).slice(0, 3000)}
    
    GATILHOS EMOCIONAIS:
    ${JSON.stringify(gatilhosEmocionaisVertex, null, 2)}
    `;
    
    const prompt = `
    ##  OBJETIVO
 Guiar o cliente até escolher um smartphone da lista apresentada e fechar a venda,
 sempre valorizando experiência, suporte humanizado e diferencial da loja.
 
 ##  TOM_DE_VOZ (tomDeVozVertex)
 - Saudação acolhedora porém direta.
 - Use vocativo informal respeitoso (ex.: “Perfeito, Felipe!”).
 - Emojis: 💜 obrigatório + 1 contextual; use 🔥 para descontos.
 - Até 250 caracteres por bloco; quebre linhas por assunto.
 - Pontuação dupla (“!!”, “…” ) permitida.
 
 ##  GATILHOS_EMOCIONAIS (gatilhosEmocionaisVertex)
 - Priorize Segurança ➜ Rapidez ➜ Transferência de dados na hora.
 - Explore “Garantia empática”, “Telefone reserva”, “Loja física confiável”.
 - Conecte benefícios à vida diária (produtividade, memórias, status).
 
 ##  OBJECÇÕES & COMPARATIVOS (objeçõesVertex)
 - Se cliente comparar preço online → explique valor agregado (lista de diferenciais).
 - Descontos: só R$ 100 à vista, ofereça **após** defender valor.
 - Parcelamento padrão 10×; ofereça 12× **apenas se insistir** muito.
 - Use analogias para comparar serviços (ex.: “comprar só preço é como…”).
 
 ##  REGRAS_DE_ESTILO
 - Nunca comece resposta com saudação completa; a conversa já está em andamento.
 - Seja conciso e humanizado; máximo 3 blocos (“emoção”, “benefício”, “call-to-action”).
 - Sempre feche perguntando algo que avance (ex.: “Fecho em 10× pra você?”).
 ###############################
 
     📜 Histórico da conversa:
     ${conversaCompleta}
     
     📨 Última mensagem do cliente:
     "${extras.msgContent}"
     
     📱 Modelos apresentados:
     ${modelos.map(m => `➡️ *${m.nome}*\n${m.descricao}\n💵 Preço: R$ ${m.preco.toFixed(2)}`).join("\n")}
     
     💰 Preços (para cálculo de desconto):
     ${modelos.map(m => `• ${m.nome}: R$ ${m.preco.toFixed(2)}`).join("\n")}
 
     Nome do usuario
     ${nome}
     `;  
    
  
    const respostaIA = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: contexto },  // ✅ system primeiro
        { role: "user", content: prompt }
      ],
      temperature: 0.9,
      max_tokens: 150
    });
  
    const respostaFinal = respostaIA.choices[0]?.message?.content?.trim();
  
    if (!respostaFinal) {
      return await sendBotMessage(sender, "📌 Estou verificando... Pode repetir a dúvida de forma diferente?");
    }
  
    return await sendBotMessage(sender, respostaFinal);
  },
  identificarModeloPorNome: async (sender, _args, { msgContent, pushName }) => {
    await setUserStage(sender, "agente_de_demonstracao_por_nome_por_boleto");
    const novoStage = await getUserStage(sender);
    await sendBotMessage(sender, novoStage);
    return await agenteDeDemonstracaoPorNomePorBoleto({ sender, msgContent, pushName });
  }
};

const functions = [
  {
    name: "demonstracaoDetalhada",
    description: "Chama a função para mostrar o modelo que o usuário escolheu.",
    parameters: {
      type: "object",
      properties: {
        modeloMencionado: { type: "string", description: "Nome exato do modelo escolhido." }
      },
      required: ["modeloMencionado"]
    }
  },
  {
    name: "responderDuvida",
    description: "Responde a uma dúvida específica do cliente sobre um ou mais modelos sugeridos anteriormente.",
    parameters: {
      type: "object",
      properties: {
        resposta: {
          type: "string",
          description: "Texto da resposta explicando diferenças, vantagens ou informações adicionais."
        }
      },
      required: ["resposta"]
    }
  },
  {
    name: "identificarModeloPorNome",
    description: "Cliente mudou de ideia e pediu um novo modelo.",
    parameters: {
      type: "object",
      properties: {}
    }
  }
];

module.exports = { agenteDeDemonstracaoPosDecisaoPorBoleto };
