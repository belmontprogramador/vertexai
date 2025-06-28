const { sendBotMessage } = require('../../messageSender');
const { setUserStage } = require('../../redisService');
const OpenAI = require('openai');

const { prepararContextoDeModelosRecentes } = require("../../utils/utilitariosDeMensagem/prepararContextoDeModelosRecentes");
const { prepararContextoDeModelosRecentesFluxo } = require("../../utils/utilitariosDeMensagem/prepararContextoDeModelosRecentesFluxo");

require("dotenv").config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const rotinaDeAgendamento = async ({ sender, msgContent, pushName }) => {
  await setUserStage(sender, "agendamento");

  // 🔄 Carrega ambos os contextos
  const contexto1 = await prepararContextoDeModelosRecentes(sender);
  const contexto2 = await prepararContextoDeModelosRecentesFluxo(sender);

  // 🧠 Escolhe a versão com mais modelos como a principal
  const contexto = (contexto2.modelos?.length || 0) >= (contexto1.modelos?.length || 0)
    ? contexto2
    : contexto1;

  const {
    nomeUsuario: nomeCliente,
    modelos,
    modelosConfirmados,
    conversaCompleta
  } = contexto;

  // 🎯 Pega o modelo confirmado mais recente, ou primeiro sugerido
  const modeloEscolhido = modelosConfirmados.length > 0
    ? modelos.find(m => m.nome === modelosConfirmados[modelosConfirmados.length - 1])
    : modelos[0];

  // ✍️ Prompt para gerar o resumo
  const prompt = [
    {
      role: "system",
      content: `
Você é a Anna, uma vendedora especialista da Vertex Store. Gere um *resumo breve* do atendimento com foco em:

- Nome do cliente: ${nomeCliente || "não informado"}
- Modelo demonstrado: ${modeloEscolhido?.nome || "não houve modelos demonstrados"}
- Histórico da conversa:
${conversaCompleta}

Sempre entregue o resumo no formato abaixo.
Considere como *intenção de agendamento* qualquer menção a datas, dias da semana, horários ou frases como "vou passar aí", "volto depois", etc.

Inclua no resumo:
• Interesse do cliente  
• Modelo(s) demonstrado(s)  
• Objeções respondidas  
• Dúvidas técnicas  
• Dúvidas sobre financiamento  
• Clima da negociação (frio, morno, quente)  
• Qualquer menção a agendamento ou data provável  

Seja direto e escreva como um vendedor humano de loja física.
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

  // ✅ Envia o resumo para a equipe interna
  await sendBotMessage("5521983735922", `📋 *Resumo do atendimento (${sender})*\n\n${resumoFinal}`);
  await sendBotMessage("5522992484280", `📋 *Resumo do atendimento (${sender})*\n\n${resumoFinal}`)
  await sendBotMessage("5522988319544", `📋 *Resumo do atendimento (${sender})*\n\n${resumoFinal}`)
  await sendBotMessage("5522999018533", `📋 *Resumo do atendimento (${sender})*\n\n${resumoFinal}`)
  await sendBotMessage("5522998668966", `📋 *Resumo do atendimento (${sender})*\n\n${resumoFinal}`)

  // ✅ Continua o fluxo com o cliente
  await sendBotMessage(sender, `Perfeito! Vou te encaminhar para o setor de agendamento 💜`);
};

module.exports = { rotinaDeAgendamento };
