const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

 
/**
 * 🔍 Gera uma pergunta para a fase de sondagem com base nas respostas anteriores
 */
const agenteDeDesondagem = async (produtoDesejado, necessidade, investimento, historicoDeConversa) => {
    const contextoUsuario = `
    O cliente está buscando um celular para: ${necessidade}.
    Orçamento disponível: ${investimento}.
    Produto desejado: ${produtoDesejado}.
    
    Gere uma resposta curta (máximo 3 frases), clara e objetiva, que mostre os benefícios de um celular nesse contexto e incentive o cliente a continuar conversando.
    Evite repetições ou introduções longas.
    Finalize com uma pergunta simples e direta.
    `;
    

    const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: contextoUsuario }],
        temperature: 0.8,
        max_tokens: 150
    });

    return completion.choices[0].message.content.trim();
};

/**
 * 🙋‍♀️ Gera uma mensagem humanizada de introdução à fase de sondagem
 * Objetivo: Engajar o usuário de forma natural antes da primeira pergunta
 */
const agenteDeSondagemAterrizagem = async () => {
    const prompt = `
  Você é uma atendente virtual simpática e acolhedora.
  Gere uma mensagem curta e humanizada (até 2 frases) para iniciar uma conversa com o cliente antes de fazer a primeira pergunta da sondagem.
  O objetivo é deixá-lo à vontade e engajado para responder.
  
  ⚠️ Regras:
  - Não use linguagem técnica
  - Seja simpática, natural e direta
  - Não diga "vamos iniciar a sondagem"
  - Finalize com algo como: "Me conta..." ou "Pode me dizer..."
  
  Exemplo: "Que bom ter você aqui! Me conta, o que você está procurando hoje?"
  `;
  
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 80
    });
  
    return completion.choices[0].message.content.trim();
  };
  
   

  /**
 * 💬 Gera uma introdução personalizada para a pergunta 2 com base no produto desejado
 * Ex: "Ah, entendi! Você está procurando um celular. E para que você pretende usá-lo no dia a dia?"
 */
const agenteDeSondagemDeProduto = async (produtoAnterior, pushNameProduto) => {
    const prompt = `
  O cliente de nome "${pushNameProduto}" informou que está interessado no seguinte produto: "${produtoAnterior}".
  
  Crie uma mensagem curta e humanizada (1 ou 2 frases no máximo), demonstrando que você entendeu o produto que ele quer e conduzindo naturalmente para a próxima pergunta, que será sobre a finalidade de uso do produto.
  
  ⚠️ Regras:
  - Não use linguagem técnica
  - Repita o nome do produto uma vez
  -chame pelo nome
  - Seja natural, empático e conduza com leveza
  - Finalize com algo como: "Pra que tipo de uso você está pensando?" ou similar
  `;
  
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 100
    });
  
    return completion.choices[0].message.content.trim();
  };

  /**
 * 💬 Gera uma introdução humanizada antes da pergunta sobre finalidade de uso (pergunta 2)
 */
const agenteDeNecessidade = async (necessidade, produtoDesejado2) => {
    const prompt = `
  O cliente informou que tem seguinte necessidade para o produto: "${necessidade}".
  O cliente informou que está interessado no seguinte produto: "${ produtoDesejado2}".
  
  Gere uma mensagem curta (1 ou 2 frases), acolhedora e natural, demonstrando que você entendeu o produto desejado e engajando o cliente para responder sobre a finalidade de uso.
  
  ⚠️ Regras:
  - Não seja genérico
  - Use o nome do produto e sua finalidade uma única vez de forma natural
  - Finalize com algo leve como: "Me conta, pra que você pretende usar?" ou "E no seu dia a dia, como esse produto vai te ajudar?"
  - NÃO faça a pergunta diretamente, apenas prepare o terreno
  `;
  
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 100
    });
  
    return completion.choices[0].message.content.trim();
  }; 

/**
 * 🙌 Gera uma mensagem de fechamento da sondagem, abrindo espaço para seguir para a demonstração
 */
const agenteDeFechamentoSondagem = async () => {
  const prompt = `
Você é uma atendente virtual simpática.

Crie uma mensagem de encerramento da etapa de sondagem. A mensagem deve demonstrar que todas as informações foram coletadas e que o sistema já está pronto para seguir para a próxima etapa: a demonstração de produtos.

⚠️ Regras:
- Seja natural, acolhedora e positiva
- Não repita as respostas do cliente
- Indique que em breve ele verá as melhores opções
- Finalize com uma pergunta simples que incentive o usuário a responder e seguir adiante, como:
  - "Quer ver o que separamos pra você?"
  - "Posso te mostrar algumas sugestões agora?"
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 100
  });

  return completion.choices[0].message.content.trim();
};   

module.exports = { 
    agenteDeSondagemAterrizagem,
    agenteDeSondagemDeProduto,
    agenteDeNecessidade,
    agenteDeDesondagem,
    agenteDeFechamentoSondagem
}