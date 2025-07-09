const TEMPOS_POR_STAGE = {
  // 🟢 Atendimento padrão (respostas rápidas)
  rotina_captura_de_nome: 1,
  agente_de_identificacao_de_nome: 1,
  rotina_de_primeiro_atendimento: 2,
  opean_Ai_Services_Atendimento: 3,
  reinicio_de_atendimento: 2,

  // 🟡 Atendimento para boleto (processos médios)
  rotina_captura_de_nome_para_boleto: 2,
  agente_de_identificacao_de_nome_para_boleto: 2,

  // 🟡 Atendimento para tráfego (médio)
  rotina_captura_de_nome_para_trafego: 2,
  agente_de_identificacao_de_nome_para_trafego: 2,

  // 🟠 Demonstração por valor
  rotina_de_demonstracao_de_celular_por_valor: 4,
  filtro_de_valor: 10,
  agente_de_demonstracao_por_valor: 10,
  identificar_modelo_por_nome_pos_demonstracao_por_valor: 3,
  agente_de_demonstracao_por_nome_por_valor: 3,

  // 🟠 Demonstração por nome
  rotina_de_demonstracao_de_celular_por_nome: 5,
  identificar_modelo_por_nome: 4,
  identificar_modelo_por_nome_pos_demonstracao: 4,
  agente_de_demonstracao_por_nome: 4,
  agente_de_decisao_pos_demonstracao: 4,

  // 🔴 Demonstração detalhada (mais longas)
  agente_de_demonstracao_detalhada: 20,
  agente_de_demonstracao_detalhada_boleto: 20,

  // 🔴 Demonstração por boleto (complexas)
  opena_ai_services_boleto_decisao_1: 6,
  rotina_de_boleto: 5,
  open_ai_services_boleto_decisao_2: 60,
  open_ai_services_duvidas_boleto: 5,
  agente_de_demonstracao_por_boleto: 6,
  agente_de_demonstracao_por_nome_por_boleto: 6,
  agente_de_demonstracao_pos_decisao_por_boleto: 8,

  // 🟡 Agendamento
  rotina_de_agendamento: 3,

  // 🟤 Fallback
  default: 20
};

const obterTempoDeBloqueio = (stage) => {
  return TEMPOS_POR_STAGE[stage] || TEMPOS_POR_STAGE.default;
};

module.exports = { obterTempoDeBloqueio };
