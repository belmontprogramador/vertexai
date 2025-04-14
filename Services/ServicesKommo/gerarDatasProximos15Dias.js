const axios = require("axios");
const { sendBotMessage } = require("../messageSender");
require("dotenv").config();

const KOMMO_BASE_URL = "https://contatovertexstorecombr.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN;
const headers = {
  Authorization: `Bearer ${KOMMO_TOKEN}`,
  "Content-Type": "application/json"
};

// Função para gerar os timestamps de cada dia (sem domingos) nos próximos 15 dias
function gerarIntervalosDeConsulta() {
  const intervalos = [];
  const hoje = new Date();

  let adicionados = 0;
  let i = 1;

  while (adicionados < 15) {
    const data = new Date(hoje);
    data.setDate(data.getDate() + i);

    if (data.getDay() !== 0) { // Ignora domingos
      const inicio = new Date(data);
      inicio.setHours(0, 0, 0, 0);
      const fim = new Date(data);
      fim.setHours(23, 59, 59, 999);

      intervalos.push({
        dataFormatada: data.toLocaleDateString("pt-BR"),
        timestamp_inicio: Math.floor(inicio.getTime() / 1000),
        timestamp_fim: Math.floor(fim.getTime() / 1000)
      });

      adicionados++;
    }
    i++;
  }

  return intervalos;
}

// Consulta tarefas já agendadas na Kommo dentro de um intervalo
async function consultarTarefasPorDia({ timestamp_inicio, timestamp_fim }) {
  const url = `${KOMMO_BASE_URL}/api/v4/tasks`;
  const params = {
    "filter[is_completed]": 0,
    "filter[complete_till][from]": timestamp_inicio,
    "filter[complete_till][to]": timestamp_fim,
    limit: 250
  };

  const response = await axios.get(url, { headers, params });
  return response.data._embedded?.tasks || [];
}

// Horários fixos da agenda (9h às 15h)
const HORARIOS_FIXOS = [9, 10, 11, 12, 13, 14, 15];

// Consulta todos os dias e envia mensagem com horários disponíveis
async function listarHorariosDisponiveis(sender) {
  const dias = gerarIntervalosDeConsulta();
  const resultadoFinal = [];

  for (const dia of dias) {
    const tarefas = await consultarTarefasPorDia(dia);
    const ocupados = new Set(
      tarefas.map(tarefa => new Date(tarefa.complete_till * 1000).getHours())
    );

    const disponiveis = HORARIOS_FIXOS.filter(hora => !ocupados.has(hora));

    resultadoFinal.push({
      data: dia.dataFormatada,
      horariosDisponiveis: disponiveis.map(h => `${String(h).padStart(2, "0")}:00`)
    });
  }

  const mensagem = resultadoFinal.map(item => {
    if (item.horariosDisponiveis.length === 0) {
      return `📅 ${item.data}: Nenhum horário disponível.`;
    }
    return `📅 ${item.data}: ${item.horariosDisponiveis.join(", ")}`;
  }).join("\n");

  await sendBotMessage(sender, `📆 *Horários disponíveis para os próximos 15 dias:*\n\n${mensagem}\n\n👉 Me diga qual data e hora você prefere.`);
}

module.exports = { listarHorariosDisponiveis };
