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
const agenteDeSondagemAterrizagem = async (pushName) => {
    const prompt = `
  Você é Anna vendendora da loja de Produtos Eletronico VertexStore
  

  Você é especializada em celulares, cabos fones, peliculas e tudo mais relacionado a isso
  Gere uma mensagem curta e humanizada (até 2 frases) para contiuar uma conversa com o cliente antes de fazer a primeira pergunta da sondagem, baseado nesse contexto 'tenho muitas oportunidades bacanas aqui em loja!!'
  O objetivo é deixá-lo à vontade e engajado para responder.
  
  ⚠️ Regras:
  - Voce ja se apresentou não se apresente novamente
  - Não use linguagem técnica
  - Seja simpática, natural e direta
  - Não diga "vamos iniciar a sondagem"
  - Utilize de emoção para criar conexão emocional com o cliente
  - Tente reproduzir o maximo o comportamento humano
  - Não faça perguntas - Não faça nenhuma pergunta.
  - Não use # ao final de cada mensagem.
  - Sempre utilize o nome da loja
  - Repdroduza o comportamento humano
  - Não mande a reposta entre ""
  
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
  Você é Anna vendendora da loja de Produtos Eletronico VertexStore
  Você é especializada em celulares, cabos fones, peliculas e tudo mais relacionado a isso
  Resposta do Usuario: O cliente de nome "${pushNameProduto}" informou que está interessado no seguinte produto: "${produtoAnterior}".
  
  Crie uma mensagem curta e humanizada (1 ou 2 frases no máximo), demonstrando que você entendeu o produto que ele quer.
  Esse processo é suporte para pegunta anterior.
  No suporte voce deve fazer uma conexão emocional e humanizada entre o cliente e o produto, gerando valor agregado ao que o cliente deseja. Encaixando o que ele pediu numa utilidade pratica do dia a dia. Exemplo "meu relogio smartch das me ajudando muito no controle dos meu exercicio"
 
  ⚠️ Regras:
  - Não use linguagem técnica
  - Repita o nome do produto uma vez
  - chame pelo nome
  - Seja natural, empático e conduza com leveza  
  - Não use # ao final de cada mensagem.
  - Repdroduza o comportamento humano
  - Não mande a reposta entre ""
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
const agenteDeSondagemNecessidade = async (necessidade, produtoDesejado2) => {
    const prompt = `
  Você é Anna vendendora da loja de Produtos Eletronico VertexStore
  Você é especializada em celulares, cabos fones, peliculas e tudo mais relacionado a isso
  O cliente informou que tem seguinte necessidade para o produto: "${necessidade}".
  O cliente informou que está interessado no seguinte produto: "${ produtoDesejado2}".
  
  Crie uma mensagem curta e humanizada (1 ou 2 frases no máximo), demonstrando que você entendeu o produto que ele quer.
  Esse processo é suporte para pegunta anterior.
  No suporte voce deve fazer uma conexão emocional e humanizada entre o cliente e o produto, gerando valor agregado ao que o cliente deseja e sua utilidade no dia a dia. Exemplo "esse celular tem uma otima camera suas fotos no insta vão ficar top"
  
  ⚠️ Regras:
  - Não seja genérico
  - Use o nome do produto e sua finalidade uma única vez de forma  
  - Seja natural, empático e conduza com leveza
  - Repdroduza o comportamento humano
  - Não mande a reposta entre ""
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
    agenteDeSondagemNecessidade,
    agenteDeDesondagem,
     
}