const { sendBotMessage } = require("../../../messageSender");
const {
  setUserStage,
  storeSelectedModel,
  getChosenModel
} = require("../../../redisService");

const { buscarProdutosPorCategoria } = require("../../../ServiceBling/blingProductByCategoryService");
const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const gerarCopyEstiloVendedor = async (modelo) => {
  const prompt = `
Crie uma mensagem empolgante e persuasiva para WhatsApp sobre o celular abaixo, como se fosse um vendedor especialista. Siga o modelo abaixo:

🔥 *NOME DO CELULAR – FRASE DE IMPACTO!*🔥  
_Resumo cativante sobre o aparelho, destacando o principal benefício._  
• *Processador:* destaque a performance  
• *Design:* estilo visual e acabamento  
• *Bateria:* duração  
• *Câmera:* IA ou qualidade  
ao passar o preço de uma estiva porque ele pode variar de acordo com o parcelamento e juros da payjoy que normalmente é entre   **deixei isso  bem claro na mensagem**

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

const agenteDeDemonstracaoPorNome = async ({ sender, msgContent, pushName }) => {
  await setUserStage(sender, "agente_de_demonstraçao_por_nome");

  const entradaOriginal = await getChosenModel(sender);
  if (!entradaOriginal) {
    return await sendBotMessage(sender, "❌ Não consegui identificar o modelo. Pode repetir o nome?");
  }

  const celulares = await buscarProdutosPorCategoria();

  const modelo = celulares.find(c =>
    entradaOriginal.toLowerCase() === c.nome.toLowerCase() ||
    c.nome.toLowerCase().includes(entradaOriginal.toLowerCase())
  );

  if (!modelo) {
    return await sendBotMessage(sender, "❌ Modelo não encontrado. Pode verificar o nome e tentar novamente?");
  }

  // Salva o modelo selecionado
  await storeSelectedModel(sender, modelo.nome);

  // Gera copy estilo vendedor com GPT
  const copy = await gerarCopyEstiloVendedor(modelo);
  await sendBotMessage(sender, copy);

  //ligar direto no agente de detalhamento
 
};

module.exports = { agenteDeDemonstracaoPorNome };
