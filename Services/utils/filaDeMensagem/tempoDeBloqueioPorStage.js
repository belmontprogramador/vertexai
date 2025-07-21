const TEMPOS_POR_STAGE = {
  // 🟢 Atendimento padrão (respostas rápidas)
  rotina_captura_de_nome: 20,
  agente_de_identificacao_de_nome: 20,
  rotina_de_primeiro_atendimento: 20,
  opean_Ai_Services_Atendimento: 20,
  reinicio_de_atendimento: 20,

  // 🟡 Atendimento para boleto (processos médios)
  rotina_captura_de_nome_para_boleto: 30,
  agente_de_identificacao_de_nome_para_boleto: 30,

  // 🟡 Atendimento para tráfego (médio)
  rotina_captura_de_nome_para_trafego: 20,
  agente_de_identificacao_de_nome_para_trafego: 20,

  // 🟠 Demonstração por valor
  rotina_de_demonstracao_de_celular_por_valor: 4,
  filtro_de_valor: 20,
  agente_de_demonstracao_por_valor: 10,
  identificar_modelo_por_nome_pos_demonstracao_por_valor: 20,
  agente_de_demonstracao_por_nome_por_valor: 20,

  // 🟠 Demonstração por nome
  rotina_de_demonstracao_de_celular_por_nome: 25,
  identificar_modelo_por_nome: 25,
  identificar_modelo_por_nome_pos_demonstracao: 25,
  agente_de_demonstracao_por_nome: 25,
  agente_de_decisao_pos_demonstracao: 4,

  // 🔴 Demonstração detalhada (mais longas)
  agente_de_demonstracao_detalhada: 30,
  agente_de_demonstracao_detalhada_boleto: 30,

  // 🔴 Demonstração por boleto (complexas)
  opena_ai_services_boleto_decisao_1: 25,
  rotina_de_boleto: 25,
  open_ai_services_boleto_decisao_2: 60,
  open_ai_services_duvidas_boleto: 25,
  agente_de_demonstracao_por_boleto: 30,
  agente_de_demonstracao_por_nome_por_boleto: 30,
  agente_de_demonstracao_pos_decisao_por_boleto: 30,

  // 🟡 Agendamento
  rotina_de_agendamento: 3,

  // 🟤 Fallback
  default: 30
};

const obterTempoDeBloqueio = (stage) => {
  return TEMPOS_POR_STAGE[stage] || TEMPOS_POR_STAGE.default;
};

module.exports = { obterTempoDeBloqueio };
