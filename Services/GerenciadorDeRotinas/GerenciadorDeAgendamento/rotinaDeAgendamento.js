const { sendBotMessage } = require('../../messageSender');
const {
  setUserStage,
  getConversation,
  getNomeUsuario
} = require('../../redisService');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const rotinaDeAgendamento = async ({ sender, msgContent, pushName }) => {
  await setUserStage(sender, "agendamento");

  const historico = await getConversation(sender);
  const nomeCliente = await getNomeUsuario(sender);

  // 🧠 Extração do modelo sugerido a partir do histórico
  const trechoComModelo = historico.find(
    (m) => typeof m === "string" && m.includes("modelo_sugerido_json:")
  );
  
  let modeloEscolhido = null;

  if (trechoComModelo) {
    try {
      const jsonString = trechoComModelo.split("modelo_sugerido_json:")[1].trim();
      modeloEscolhido = JSON.parse(jsonString);
    } catch (e) {
      console.warn("Erro ao parsear modelo_sugerido_json:", e);
    }
  }

  const conversaFormatada = historico.join("\n");
  console.log(`este log esta vindo de agendamento de ${conversaFormatada}`)
  // Prompt para o GPT gerar o resumo
  const prompt = [
    {
      role: "system",
      content: `
  Você é a Anna, uma vendedora especialista da Vertex Store. Gere um *resumo breve* do atendimento com foco em:
  
  - Nome do cliente: ${nomeCliente || "não informado"}
  - Modelo demonstrado: ${modeloEscolhido?.nome || "não houve modelos demonstrados"}
  - Histórico da conversa:
  ${conversaFormatada}

  - Sempre entregue o resumo no formato abaixo
  - Em relação a datas de agendamento pode ser um dia da semana, assim como uma referencia numerica de datas, ou qulquer intenção de dia data ou horario
  
  Analise as informações acima e gere um resumo claro e humano, abordando:
  • Interesse do cliente
  • Modelo(s) demonstrado(s)
  • Objeções respondidas
  • Dúvidas técnicas
  • Dúvidas sobre financiamento
  • Clima da negociação (frio, morno, quente)
  • Informações sobre datas de agendamento
  
  Responda no estilo de um vendedor humano e direto ao ponto, sem linguagem de IA.
      `.trim()
    }
  ];

  let resumoFinal = "Resumo indisponível no momento.";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: prompt,
      temperature: 0.7,
      max_tokens: 300
    });

    resumoFinal = completion.choices?.[0]?.message?.content?.trim() || resumoFinal;
  } catch (error) {
    console.error("Erro ao gerar resumo do atendimento:", error);
  }

  // Envia o resumo para o número da loja/supervisor
  await sendBotMessage("5521983735922", `📋 *Resumo do atendimento (${sender})*\n\n${resumoFinal}`);

  // Continua o fluxo normal com o cliente
  await sendBotMessage(sender, `Perfeito vou te encaminhar parao setor de agendamento`);
  // await sendBotMessage(sender, `vou chamar outro atendente`);
  
};

module.exports = { rotinaDeAgendamento };
