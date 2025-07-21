const cron = require("node-cron");
const { buscarPedidosDoDiaAtual } = require("./buscarPedidosDoDiaAtual"); // arquivo com a função do dia atual
const { sendBotMessage } = require("../messageSender");

const criarMensagemResumo = (relatorio, nomeDestinatario) => {
  return `
Oi, bom dia ${nomeDestinatario}! Aqui é a equipe Vertex.

📊 *Relatório de Vendas do Dia* 📊

📅 Período: ${relatorio.periodo.dataInicial}

🛒 Total pedidos: ${relatorio.totalPedidos}
💰 Valor faturado: R$ ${relatorio.valorTotalFaturado.toFixed(2)}
📈 Ticket médio: R$ ${relatorio.ticketMedio.toFixed(2)}

Obrigado pela atenção!
`;
};

const jobRelatorioDoDia = async () => {
  try {
    console.log("[Cron] Executando relatório diário do dia atual...");

    // Recebe o relatório direto da função
    const relatorio = await buscarPedidosDoDiaAtual();

    if (!relatorio) {
      throw new Error("Relatório do dia atual está vazio ou não foi gerado.");
    }

    // Destinatários (nome e telefone)
    const destinatarios = [
      { telefone: "5521983735922", nome: "Felipe" },
      { telefone: "5521983735922", nome: "Vitão" },
      { telefone: "5521983735922", nome: "Juninho" },
    ];

    for (const destinatario of destinatarios) {
      const mensagem = criarMensagemResumo(relatorio, destinatario.nome);
      await sendBotMessage(destinatario.telefone, mensagem);
      console.log(`[Cron] Relatório do dia enviado para ${destinatario.nome} (${destinatario.telefone})`);
    }

    console.log("[Cron] Todas as mensagens do relatório do dia enviadas com sucesso!");
  } catch (err) {
    console.error("[Cron] Erro ao executar relatório diário do dia:", err);
  }
};

// Cron para rodar todo dia às 9h da manhã (horário de São Paulo)
cron.schedule("0 9 * * *", jobRelatorioDoDia, {
  timezone: "America/Sao_Paulo",
});

module.exports = { jobRelatorioDoDia };
