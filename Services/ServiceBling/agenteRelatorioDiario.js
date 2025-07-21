const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const { buscarPedidosPorPeriodo } = require("./blingVendasPorVendedorService");
const { sendBotMessage } = require("../messageSender");

const RELATORIO_PATH = path.resolve(__dirname, "./relatorio_vendas_periodo.json");

const formatarDataBr = (date) => {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const offset = -3; // GMT-3
  const dateBr = new Date(utc + 3600000 * offset);
  const year = dateBr.getFullYear();
  const month = String(dateBr.getMonth() + 1).padStart(2, "0");
  const day = String(dateBr.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const criarMensagemResumo = (relatorio, nomeDestinatario) => {
  return `
Oi bom dia Anna por aqui! Eu e o Felipe estamos trabalhando nessa tarefa\n para enviar os relatorios de venda mensal.\n Em bereve faremos mais atualizações!\n Por enquanto é isso!\n
📊 *Relatório de Vendas Diário* 📊

Olá ${nomeDestinatario},

📅 Período: ${relatorio.periodo.dataInicial} até ${relatorio.periodo.dataFinal}

🛒 Total pedidos: ${relatorio.totalPedidos}
💰 Valor faturado: R$ ${relatorio.valorTotalFaturado.toFixed(2)}
📈 Ticket médio: R$ ${relatorio.ticketMedio.toFixed(2)}

Obrigado!
`;
};

const jobRelatorioDiario = async () => {
  try {
    console.log("[Cron] Executando relatório diário...");
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const dataInicial = formatarDataBr(primeiroDiaMes);
    const dataFinal = formatarDataBr(hoje);

    await buscarPedidosPorPeriodo(dataInicial, dataFinal);

    const relatorioRaw = fs.readFileSync(RELATORIO_PATH, "utf8");
    const relatorio = JSON.parse(relatorioRaw);

    // Lista dos destinatários com nome e telefone
    const destinatarios = [
      { telefone: "5521983735922", nome: "Felipe" },
      { telefone: "5521983735922", nome: "Vitão" },
      { telefone: "5521983735922", nome: "Juninho" },
    ];

    // Envia mensagem personalizada para cada destinatário
    for (const destinatario of destinatarios) {
      const mensagem = criarMensagemResumo(relatorio, destinatario.nome);
      await sendBotMessage(destinatario.telefone, mensagem);
      console.log(`[Cron] Relatório enviado para ${destinatario.nome} (${destinatario.telefone})`);
    }

    console.log("[Cron] Todas as mensagens enviadas com sucesso!");
  } catch (err) {
    console.error("[Cron] Erro ao executar relatório diário:", err);
  }
};

module.exports = { jobRelatorioDiario };
