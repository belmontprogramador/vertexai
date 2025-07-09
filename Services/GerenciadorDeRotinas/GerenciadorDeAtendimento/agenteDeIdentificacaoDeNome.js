const { sendBotMessage } = require("../../messageSender");
const {
  setUserStage,
  storeNomeUsuario
} = require("../../redisService");

const { rotinaDePrimeiroAtendimento } = require("./rotinaDePrimeiroAtendimento");
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const agenteDeIdentificacaoDeNome = async ({ sender, msgContent, pushName }) => {
  try {
    await setUserStage(sender, "rotina_de_primeiro_atendimento");

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `
Você é Anna, assistente da Vertex Store. Seu único objetivo neste momento é identificar o primeiro nome do cliente.

Tome uma decisão clara baseado na entrada do usuário. Sempre responda com um JSON contendo a ação decidida:

{
  "acao": "salvar_nome_usuario",
  "argumento": { "nome": "João" }
}

ou

{
  "acao": "pedir_nome_novamente"
}

⚠️ Regras:

- Se o cliente disser algo como "me chamo Ana", "sou o Lucas", "João aqui", extraia apenas o primeiro nome e chame "salvar_nome_usuario".
- Se o cliente disser algo genérico como "oi", "quero celular", "me ajuda", ou não disser o nome claramente, chame "pedir_nome_novamente".
- Nunca invente nomes. Só chame "salvar_nome_usuario" se houver clareza.

Sempre retorne um JSON limpo com apenas "acao" e "argumento" se aplicável.
`
        },
        { role: "user", content: msgContent }
      ]
    });

    const resposta = completion.choices[0]?.message?.content?.trim();
    let decisao = {};

    try {
      decisao = JSON.parse(resposta);
    } catch (err) {
      console.warn("❗ Resposta fora do padrão JSON:", resposta);
      decisao = { acao: "pedir_nome_novamente" };
    }

    if (decisao.acao === "salvar_nome_usuario" && decisao.argumento?.nome) {
      const nome = decisao.argumento.nome;
      await storeNomeUsuario(sender, nome);
      await setUserStage(sender, "rotina_de_primeiro_atendimento");
      return await rotinaDePrimeiroAtendimento({ sender, msgContent, pushName: nome });
    }

    // Fallback para pedir nome novamente
    await setUserStage(sender, "agente_de_identificacao_de_nome");

    const frases = [
      `A gente adora atender bem, e seu nome é fundamental pra isso. Como devo te chamar? 💜`,
      `Compartilha seu nome com a gente? Assim ajustamos tudo pra te atender do seu jeito 💜`
    ];
    const fraseEscolhida = frases[Math.floor(Math.random() * frases.length)];
    return await sendBotMessage(sender, fraseEscolhida);

  } catch (error) {
    console.error("❌ Erro no agenteDeIdentificacaoDeNome:", error.message);
    await sendBotMessage(sender, "⚠️ Ocorreu um erro ao tentar identificar seu nome. Pode repetir?");
  }
};

module.exports = { agenteDeIdentificacaoDeNome };
