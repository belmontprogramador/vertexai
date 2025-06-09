const {
    getTodosUsuariosComStageESemInteracao,
    getConversation,
    getNomeUsuario,
  } = require("../redisService");
  
  const { sendBotMessage } = require("../messageSender");
  
  // 📣 Templates com placeholder {nome}
  const mensagensDeRemarketing = {
    rotina_captura_de_nome: `👋 Oi {nome}, tudo bem? Podemos continuar de onde paramos. Me diga seu nome pra gente seguir!`,
    agente_de_identificacao_de_nome: `👤 {nome}, ainda estou esperando seu nome pra começarmos. Pode me dizer, por favor?`,
    rotina_de_primeiro_atendimento: `💬 {nome}, posso tirar dúvidas ou te mostrar nossos celulares em promoção?`,
    opean_Ai_Services_Atendimento: `🤖 {nome}, posso continuar te ajudando com alguma informação agora?`,
    reinicio_de_atendimento: `🔄 {nome}, vamos começar de novo? Me diga como posso te ajudar agora!`,
  
    rotina_captura_de_nome_para_boleto: `🧾 {nome}, pra gente seguir com o boleto, preciso saber seu nome. Pode me passar?`,
    agente_de_identificacao_de_nome_para_boleto: `📛 {nome}, ainda estou aguardando seu nome para seguir com o boleto.`,
  
    rotina_captura_de_nome_para_trafego: `🚀Opa tudo pronto para ver nossos modelos? Me diga seu nome rapidinho!`,
    agente_de_identificacao_de_nome_para_trafego: `👀 {nome}, só preciso do seu nome para mostrar as ofertas pra você!`,
  
    rotina_de_demonstracao_de_celular_por_valor: `💰 {nome}, quer ver modelos dentro do seu orçamento? Me diga o valor que pretende investir.`,
    filtro_de_valor: `📊 {nome}, posso sugerir modelos com base no seu orçamento. Me fala o valor que procura?`,
    agente_de_demonstraçao_por_valor: `💡 {nome}, posso te mostrar mais modelos que cabem no seu bolso!`,
    identificar_modelo_por_valor: `🔍 {nome}, estou procurando modelos ideais pra você. Pode me dar mais detalhes?`,
    identificar_modelo_por_nome_pos_demonstração_por_valor: `📲 {nome}, ficou alguma dúvida nos modelos que mostrei? Posso te ajudar a decidir.`,
  
    rotina_de_demonstracao_de_celular_por_nome: `📱 {nome}, me diga um modelo ou marca que você curte e eu te mostro as opções.`,
    identificar_modelo_por_nome: `🔎 {nome}, estou procurando seu modelo ideal. Pode me ajudar com mais informações?`,
    identificar_modelo_por_nome_pos_demonstração: `📩 {nome}, tem alguma dúvida sobre os modelos que te mostrei?`,
    agente_de_demonstração_por_nome: `✨ {nome}, quer ver outros modelos parecidos? Posso sugerir mais opções!`,
    aguardando_decisao_pos_demonstração: `🤔 {nome}, decidiu qual gostou mais? Se quiser, posso te ajudar a comparar!`,
  
    agente_de_demonstração_detalhada: `🎥 {nome}, posso te mandar mais detalhes ou um vídeo de demonstração do modelo?`,
  
    opena_ai_services_boleto_decisao_1: `📋 {nome}, ficou alguma dúvida sobre o modelo pra gerar o boleto?`,
    rotina_de_boleto: `🧾 {nome}, posso gerar o boleto pra você agora mesmo. Confirma pra mim!`,
    open_ai_services_boleto_decisao_2: `✅ {nome}, podemos confirmar os dados e finalizar o boleto?`,
    open_ai_services_duvidas_boleto: `❓ {nome}, ficou alguma dúvida sobre o pagamento por boleto?`,
    agente_de_demonstração_por_boleto: `📌 {nome}, posso sugerir outros modelos com boleto se quiser!`,
    agente_de_demonstracao_por_nome_por_boleto: `💡 {nome}, ficou com alguma dúvida sobre os modelos? Posso te mostrar outras opções ou ajudar na escolha.`,
    agente_de_demonstracao_pos_decisao_por_boleto: `📲 {nome}, conseguiu decidir qual modelo mais gostou? Se quiser, posso te ajudar a comparar.`,
  
    rotina_de_agendamento: `📅 {nome}, conseguimos finalizar o agendamento da sua visita?`,
  };
  
  const remarketingFollowup = async () => {
    const usuarios = await getTodosUsuariosComStageESemInteracao();
    const agora = Date.now();
    const tempoParadoMinimo = 2 * 60 * 60 * 1000; // 2 horas
  
    for (const usuario of usuarios) {
      const { sender, stage, ultimaInteracao } = usuario;
      const tempoParadoMs = agora - new Date(ultimaInteracao).getTime();
  
      if (tempoParadoMs < tempoParadoMinimo) continue;
  
      const nome = await getNomeUsuario(sender);
      const historico = await getConversation(sender);
      const ultimaMensagem = historico[historico.length - 1] || "";
  
      if (ultimaMensagem.includes("remarketing:")) continue;
  
      const template = mensagensDeRemarketing[stage] || "Oi {nome}, posso te ajudar com mais alguma informação sobre os aparelhos ou formas de pagamento? 💜";
      const mensagem = template.replace("{nome}", nome);
  
      await sendBotMessage(sender, mensagem);      
    }
  };
  
  module.exports = { remarketingFollowup };
  