const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  getUserStage,
  getUserResponses
} = require("../../../redisService");

const { buscarProdutosPorCategoria } = require("../../../ServiceBling/blingProductByCategoryService");
const extrairNumeroDeTexto = require("../../../extrairNumeroDeTexto");

const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const gerarCopyEstiloVendedor = async (modelo) => {
  const prompt = `
Crie uma mensagem empolgante e persuasiva para WhatsApp, como se fosse um vendedor especialista, sobre o celular abaixo. Use o modelo abaixo como referência, mas adapte com base nas informações do produto:

🔥 *NOME DO CELULAR – FRASE DE IMPACTO!*🔥  
_Resumo cativante sobre o aparelho, destacando o principal benefício._  
• *Processador:* destaque a performance  
• *Design:* estilo visual e acabamento  
• *Bateria:* duração  
• *Câmera:* IA ou qualidade 
  
Finalize com:
_Vertex Store: conectando você ao mundo e aproximando quem você ama!💜_

Dados do celular:
Nome: ${modelo.nome}
Descrição: ${modelo.descricao}
Preço: R$${modelo.preco.toFixed(2)}
`;

  const resposta = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8
  });

  return resposta.choices[0].message.content;
};

const agenteDeDemonstracaoPorValor = async ({ sender, pushName }) => {
  try {
    // 🧠 Busca resposta de investimento do usuário no Redis
    const respostas = await getUserResponses(sender, "sondagem");
    const valorBruto = respostas?.investimento || "";

    // 🔍 Extrai valor numérico mesmo se estiver por extenso ou dentro de frases
    const numeroExtraido = extrairNumeroDeTexto(valorBruto);

    if (!numeroExtraido || isNaN(numeroExtraido)) {
      return await sendBotMessage(
        sender,
        "❌ Não consegui entender o valor que você deseja investir. Pode me informar novamente? (ex: 'mil reais', '2000', 'até dois mil')"
      );
    }

    const faixaMin = numeroExtraido - 300;
    const faixaMax = numeroExtraido + 300;

    // 📦 Busca celulares da API do Bling
    const celulares = await buscarProdutosPorCategoria();

    const modelosFiltrados = celulares.filter((cel) =>
      cel.preco >= faixaMin && cel.preco <= faixaMax
    );

    if (modelosFiltrados.length === 0) {
      return await sendBotMessage(
        sender,
        "😕 Não encontrei nenhum modelo dentro da sua faixa de investimento. Quer tentar outro valor?"
      );
    }

    // ✅ Mostra os modelos encontrados
    await sendBotMessage(
      sender,
      `📊 Com base no seu investimento aproximado de *R$${numeroExtraido.toFixed(
        2
      )}*, aqui estão algumas opções:`
    );

    for (const modelo of modelosFiltrados) {
      const copy = await gerarCopyEstiloVendedor(modelo);
      await sendBotMessage(sender, copy);
    }

    // 🧭 Atualiza stage e pergunta sobre preferência
    await setUserStage(sender, "identificar_modelo");
    const stage = await getUserStage(sender);
    console.log(`📶 [DEBUG] Stage atualizado para: ${stage}`);

    await sendBotMessage(
      sender,
      "👉 Qual desses modelos chamou mais sua atenção?"
    );
  } catch (error) {
    console.error("❌ Erro no agenteDeDemonstracaoPorValor:", error);
    await sendBotMessage(
      sender,
      "❌ Ocorreu um erro ao buscar os modelos. Tente novamente mais tarde."
    );
  }
};

module.exports = { agenteDeDemonstracaoPorValor };
