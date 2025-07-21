const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { gerarNovoAccessToken } = require('./blingTokenRefreshService.js');

const REFRESH_TOKEN_PATH = path.resolve(__dirname, './bling_refresh_token.json');
const RELATORIO_PATH = path.resolve(__dirname, './relatorio_vendas_periodo.json');

const getAccessToken = async () => {
  if (!fs.existsSync(REFRESH_TOKEN_PATH)) {
    throw new Error('Arquivo bling_refresh_token.json não encontrado.');
  }
  const data = JSON.parse(fs.readFileSync(REFRESH_TOKEN_PATH, 'utf8'));
  const expirado = !data.expires_at || Date.now() >= data.expires_at;
  if (expirado) {
    console.log("🔁 Token expirado. Gerando novo...");
    await gerarNovoAccessToken();
    const novo = JSON.parse(fs.readFileSync(REFRESH_TOKEN_PATH, 'utf8'));
    return novo.access_token;
  }
  return data.access_token;
};

const buscarPedidosPorPeriodo = async (dataInicial, dataFinal) => {
  const token = await getAccessToken();
  let pagina = 1;
  let todosPedidos = [];

  try {
    while (true) {
      const { data } = await axios.get('https://www.bling.com.br/Api/v3/pedidos/vendas', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          dataInicial,
          dataFinal,
          pagina,
          limite: 100,
        },
      });

      const pedidos = data.data || [];
      todosPedidos = todosPedidos.concat(pedidos);

      

      if (pagina === 1 && pedidos.length > 0) {
         
      }

      if (pedidos.length < 100) break;
      pagina++;
    }

   

    // A partir daqui mantém seu cálculo de KPIs igual
    // ...

    // KPIs gerais
    const totalPedidos = todosPedidos.length;
    const valorTotalFaturado = todosPedidos.reduce((acc, pedido) => acc + Number(pedido.total || 0), 0);
    const ticketMedio = totalPedidos ? valorTotalFaturado / totalPedidos : 0;
    const totalProdutosVendidos = todosPedidos.reduce((acc, pedido) => {
      if (pedido.itens && pedido.itens.length) {
        return acc + pedido.itens.reduce((sum, item) => sum + Number(item.quantidade || 0), 0);
      }
      return acc;
    }, 0);
    const mediaProdutosPorPedido = totalPedidos ? totalProdutosVendidos / totalPedidos : 0;

    // Taxa de cancelamento
    const totalCancelados = todosPedidos.filter(pedido => {
      return pedido.situacao?.valor === 6 || pedido.situacao?.descricao?.toLowerCase() === 'cancelado';
    }).length;
    const taxaCancelamento = totalPedidos ? (totalCancelados / totalPedidos) * 100 : 0;

    // KPIs por vendedor
    const vendedoresMap = {};
    todosPedidos.forEach(pedido => {
      const vendedorId = pedido.vendedor?.id || 'sem_vendedor';
      if (!vendedoresMap[vendedorId]) {
        vendedoresMap[vendedorId] = {
          id: vendedorId,
          nome: pedido.vendedor?.nome || 'Sem Vendedor',
          totalPedidos: 0,
          valorFaturado: 0,
          totalProdutos: 0,
        };
      }
      vendedoresMap[vendedorId].totalPedidos++;
      vendedoresMap[vendedorId].valorFaturado += Number(pedido.total || 0);

      if (pedido.itens && pedido.itens.length) {
        vendedoresMap[vendedorId].totalProdutos += pedido.itens.reduce((sum, item) => sum + Number(item.quantidade || 0), 0);
      }
    });

    Object.values(vendedoresMap).forEach(vendedor => {
      vendedor.ticketMedio = vendedor.totalPedidos ? vendedor.valorFaturado / vendedor.totalPedidos : 0;
      vendedor.mediaProdutosPorPedido = vendedor.totalPedidos ? vendedor.totalProdutos / vendedor.totalPedidos : 0;
    });

    // Produtos mais vendidos (agrupar por SKU)
    const produtosMap = {};
    todosPedidos.forEach(pedido => {
      if (pedido.itens && pedido.itens.length) {
        pedido.itens.forEach(item => {
          const sku = item.codigo || item.sku || 'SKU Desconhecido';
          if (!produtosMap[sku]) {
            produtosMap[sku] = {
              sku,
              descricao: item.descricao || '',
              quantidade: 0,
            };
          }
          produtosMap[sku].quantidade += Number(item.quantidade || 0);
        });
      }
    });

    const produtosMaisVendidos = Object.values(produtosMap)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);

    const relatorio = {
      periodo: { dataInicial, dataFinal },
      totalPedidos,
      valorTotalFaturado,
      ticketMedio,
      totalProdutosVendidos,
      mediaProdutosPorPedido,
      taxaCancelamento,
      vendedores: Object.values(vendedoresMap),
      produtosMaisVendidos,
      pedidos: todosPedidos,
    };

    

    console.log(`[SUCCESS] Relatório salvo em ${RELATORIO_PATH}`);
    console.log(`[INFO] Total pedidos: ${totalPedidos}`);
    console.log(`[INFO] Valor faturado: R$ ${valorTotalFaturado.toFixed(2)}`);
    console.log(`[INFO] Ticket médio: R$ ${ticketMedio.toFixed(2)}`);
    console.log(`[INFO] Total produtos vendidos: ${totalProdutosVendidos}`);
    console.log(`[INFO] Média produtos por pedido: ${mediaProdutosPorPedido.toFixed(2)}`);
    console.log(`[INFO] Taxa de cancelamento: ${taxaCancelamento.toFixed(2)}%`);
    console.log(`[INFO] Top 10 produtos mais vendidos:`);
    produtosMaisVendidos.forEach((p, idx) => {
      console.log(`  ${idx + 1}. SKU: ${p.sku}, Descrição: ${p.descricao}, Quantidade: ${p.quantidade}`);
    });

  } catch (error) {
    console.error('❌ Erro ao buscar pedidos:', error.response?.data || error.message);
  }
};



// Função para formatar data no padrão 'YYYY-MM-DD' considerando o horário de Brasília (GMT-3)
function formatarDataBr(date) {
  // Ajusta a data para GMT-3
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const offset = -3; // GMT-3
  const dateBr = new Date(utc + (3600000 * offset));

  const year = dateBr.getFullYear();
  const month = String(dateBr.getMonth() + 1).padStart(2, '0');
  const day = String(dateBr.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// Pega hoje no horário de Brasília
const hoje = new Date();

// Pega o primeiro dia do mês no horário de Brasília
const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

const dataInicial = formatarDataBr(primeiroDiaMes);
const dataFinal = formatarDataBr(hoje);

 

// Chama a função com as datas calculadas
buscarPedidosPorPeriodo(dataInicial, dataFinal);

// no final do arquivo, exporta a função
module.exports = { buscarPedidosPorPeriodo };
