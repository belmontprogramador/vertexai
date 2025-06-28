// const {
//   getTodosUsuariosComStageESemInteracao,
//   getConversation,
//   getNomeUsuario,
// } = require("../redisService");

// const { sendBotMessage } = require("../messageSender");

// // 📣 Templates estruturados por tempo e stage
// const mensagensDeRemarketing = {
//   rotina_captura_de_nome: {
//     3: `Quero te atender pelo nome e encontrar o celular perfeito pra você. Como posso te chamar? 💜`,
//     10: `Seu nome ajuda a deixar tudo sob medida: ofertas certas, respostas rápidas. Me diz, por favor? 🙂`,
//     40: `Assim que compartilhar seu nome, seguimos sem enrolação e cuidamos de cada detalhe pra você. Estou aqui! 💬`
//   },
//   agente_de_identificacao_de_nome: {
//     3: `Só confirmando: pode me dizer seu nome certinho? Assim já te passo todos os detalhes que você solicitou. 💜`,
//     10: `Com seu nome registrado libero preços, fotos e prazos sem enrolar. Como você prefere ser chamado(a)? 🙂`,
//     40: `Quando puder me contar seu nome, seguimos de onde paramos e envio tudo que pediu. Estou por aqui! 💜`
//   },
//   rotina_de_primeiro_atendimento: {
//     3: `Qual das opções do menu faz mais sentido pra você? É só responder com o número e já seguimos. 😊`,
//     10: `Para avançar, basta responder com o número da opção que te interessa. Qual escolhe? 🙂`,
//     40: `Confia e responde: quem escolhe aqui ganha acesso às oportunidades que nem aparecem na vitrine. 😉`
//   },
//   opean_Ai_Services_Atendimento: {
//     10: (nome) => `${nome}, com um valor de referência, encontro o aparelho certo sem perder tempo. Quanto quer investir? 💜`,
//     25: (nome) => `${nome}, Tenho opções que vão do essencial ao top, mas sem seu teto de preço fico sem ter base. Qual valor pretende investir? 🙂`,
//     40: (nome) => `${nome}, Orçamento na mão, proposta imediata. Diz um número e destravamos tudo agora. 💜`
//   },  
//   rotina_captura_de_nome_para_boleto: {
//     3: `Quero te atender pelo nome e encontrar o celular perfeito pra você. Como posso te chamar? 💜`,
//     10: `Seu nome ajuda a deixar tudo sob medida: ofertas certas, respostas rápidas. Me diz, por favor? 🙂`,
//     40: `Assim que compartilhar seu nome, seguimos sem enrolação e cuidamos de cada detalhe pra você. Estou aqui! 💬`
//   },
//   agente_de_identificacao_de_nome_para_boleto: {
//     3: `Só confirmando: pode me dizer seu nome certinho? Assim já te passo todos os detalhes que você solicitou. 💜`,
//     10: `Com seu nome registrado libero preços, fotos e prazos sem enrolar. Como você prefere ser chamado(a)? 🙂`,
//     40: `Quando puder me contar seu nome, seguimos de onde paramos e envio tudo que pediu. Estou por aqui! 💜`
//   },
//   rotina_captura_de_nome_para_trafego: {
//     3: `Quero te atender pelo nome e encontrar o celular perfeito pra você. Como posso te chamar? 💜`,
//     10: `Seu nome ajuda a deixar tudo sob medida: ofertas certas, respostas rápidas. Me diz, por favor? 🙂`,
//     40: `Assim que compartilhar seu nome, seguimos sem enrolação e cuidamos de cada detalhe pra você. Estou aqui! 💬`
//   },
//   agente_de_identificacao_de_nome_para_trafego: {
//     3: `Só confirmando: pode me dizer seu nome certinho? Assim já te passo todos os detalhes que você solicitou. 💜`,
//     10: `Com seu nome registrado libero preços, fotos e prazos sem enrolar. Como você prefere ser chamado(a)? 🙂`,
//     40: `Quando puder me contar seu nome, seguimos de onde paramos e envio tudo que pediu. Estou por aqui! 💜`
//   },
//   rotina_de_demonstracao_de_celular_por_valor: {
//     10: `${nome}, com um valor de referência, encontro o aparelho certo sem perder tempo. Quanto quer investir? 💜`,
//     25: `${nome}, Tenho opções que vão do essencial ao top, mas sem seu teto de preço fico sem ter base. Qual valor pretende investir? 🙂`,
//     40: `${nome}, Orçamento na mão, proposta imediata. Diz um número e destravamos tudo agora. 💜`,
//     1140: `${nome}, está aí? O dia pode ter sido corrido, mas vamos retomar seu atendimento! Vai valer a pena!`
//   },

//   filtro_de_valor: {
//     10: `${nome}, com um valor de referência, encontro o aparelho certo sem perder tempo. Quanto quer investir? 💜`,
//     25: `${nome}, Tenho opções que vão do essencial ao top, mas sem seu teto de preço fico sem ter base. Qual valor pretende investir? 🙂`,
//     40: `${nome}, Orçamento na mão, proposta imediata. Diz um número e destravamos tudo agora. 💜`,
//     1140: `${nome}, está aí? O dia pode ter sido corrido, mas vamos retomar seu atendimento! Vai valer a pena!`
//   },

//   agente_de_demonstraçao_por_valor: {
//     10: `${nome}, com um valor de referência, encontro o aparelho certo sem perder tempo. Quanto quer investir? 💜`,
//     25: `${nome}, Tenho opções que vão do essencial ao top, mas sem seu teto de preço fico sem ter base. Qual valor pretende investir? 🙂`,
//     40: `${nome}, Orçamento na mão, proposta imediata. Diz um número e destravamos tudo agora. 💜`
//   },

//   identificar_modelo_por_valor: {
//     15: `E aí, ${nome}? O que achou das opções que te mostrei? Qual ficou na frente até agora? 🙋🏼‍♀️`,
//     40: `Ana aqui! Lembrando: leva configurado na hora, garantia empática e aparelho-reserva se precisar. Te quero de telefone novo! 💜`,
//     120: `${nome}, está aí😉? Se puder me dar um retorno, ficarei grata. Estou te esperando! 🙋🏼‍♀️`,
//     1140: `${nome}, imagino que o dia tenha sido puxado. Agora é um bom momento pra continuarmos? 🙂`
//   },

//   identificar_modelo_por_nome_pos_demonstração_por_valor: {
//     15: `E aí, ${nome}? O que achou das opções que te mostrei? Qual ficou na frente até agora? 🙋🏼‍♀️`,
//     40: `Ana aqui! Lembrando: leva configurado na hora, garantia empática e aparelho-reserva se precisar. Te quero de telefone novo! 💜`,
//     120: `${nome}, está aí? Se puder me dar um retorno ficarei grata. Estou te esperando! 🙋🏼‍♀️`,
//     1140: `${nome}, imagino que o dia tenha sido puxado. Agora é um bom momento pra continuarmos? 🙂`
//   },

//   identificar_modelo_por_nome: {
//     15: `E aí, ${nome}? O que achou das opções que te mostrei? Qual ficou na frente até agora? 🙋🏼‍♀️`,
//     40: `Ana aqui! Lembrando: leva configurado na hora, garantia empática e aparelho-reserva se precisar. Te quero de telefone novo! 💜`,
//     120: `${nome}, está aí? Se puder me dar um retorno ficarei grata. Estou te esperando! 🙋🏼‍♀️`,
//     1140: `${nome}, imagino que o dia tenha sido puxado. Agora é um bom momento pra continuarmos? 🙂`
//   },

//   identificar_modelo_por_nome_pos_demonstração: {
//     15: `${nome}, me dá um retorno, o que achou? 🙂`,
//     40: `Sei que pode estar corrido aí mas me chama aqui, me chama aqui, vamos negociar! 🙋🏼‍♀️`,
//     120: `${nome}, está aí? Se puder me dar um retorno ficarei grata. Estou te esperando! 🙋🏼‍♀️`,
//     1140: `${nome}, imagino que o dia tenha sido puxado. Agora é um bom momento pra continuarmos? 🙂`
//   },

//   agente_de_demonstração_por_nome: {
//     15: `[Nome], me dá um retorno, o que achou? Tenho outras opções também! 🙂`,
//     40: `Sei que pode estar corrido aí, mas me chama aqui, me chama aqui, vamos negociar! 🙋🏼‍♀️`,
//     120: `Nome do Lead, está aí😉? Se puder me dar um retorno ficarei grata. Estou te esperando! 🙋🏼‍♀️`,
//     1140: `[Nome], imagino que o dia tenha sido puxado. Agora é um bom momento pra continuarmos? 🙂`
//   },
//   aguardando_decisao_pos_demonstração: {
//     15: `[Nome], decidiu qual gostou mais? Se quiser, posso te ajudar a comparar! 🙂`
//   },
//   agente_de_demonstração_detalhada: {
//     15: `[Nome], me dá um retorno, o que achou? 🙂`,
//     40: `Sei que pode estar corrido aí, mas me chama aqui, me chama aqui, vamos negociar! 🙋🏼‍♀️`,
//     120: `Nome do Lead, está aí😉? Se puder me dar um retorno ficarei grata. Estou te esperando! 🙋🏼‍♀️`,
//     1140: `[Nome], imagino que o dia tenha sido puxado. Agora é um bom momento pra continuarmos? 🙂`
//   },
//   opena_ai_services_boleto_decisao_1: {
//     3: `Não deixe essa chance escorregar: aprovação costuma ser alta, mas só se os dados chegarem. Responde aqui e destravamos o boleto em minutos. 😉`,
//     10: `Entendo a correria, mas esses três dados garantem crédito rápido e sem cartão. Manda agora e já te digo se sai aprovado ainda hoje. 🔒`,
//     40: `Nome, CPF e Endereço desbloqueiam crédito sem cartão nem burocracia. Envia agora e já volto dizendo se tá liberado hoje mesmo! 🚀`
//   },
//   rotina_de_boleto: {
//     3: `Não deixe essa chance escorregar: aprovação costuma ser alta, mas só se os dados chegarem. Responde aqui e destravamos o boleto em minutos. 😉`,
//     10: `Entendo a correria, mas esses três dados garantem crédito rápido e sem cartão. Manda agora e já te digo se sai aprovado ainda hoje. 🔒`,
//     40: `Nome, CPF e Endereço desbloqueiam crédito sem cartão nem burocracia. Envia agora e já volto dizendo se tá liberado hoje mesmo! 🚀`
//   },
//   open_ai_services_boleto_decisao_2: {
//     15: `Todas as respostas vêm logo após a pré-análise, [Nome]. Envie Nome, CPF e Endereço e, em 2 min, já libero os detalhes completos. 💜`,
//     40: `Sem esses três dados, fico limitado às suposições. Com eles, trago valores exatos e condições que fazem sentido. Manda pra mim e avançamos.`,
//     120: `Quanto mais atrasamos a pré-análise, mais distante fica o ‘SIM’ pro celular novo. Nome, CPF e Endereço e eu destravo tudo na hora, combinado?`
//   },
//   open_ai_services_duvidas_boleto: {
//     mensagem_inicial: (nome) => `❓ ${nome}, ficou alguma dúvida sobre o pagamento por boleto?`,
//     15: (nome) => `Oi, ${nome}! Seu crédito já tá 90 % no caminho—só falta você dar um pulinho aqui pra gente concluir. Qual dia desta semana te serve melhor?`,
//     40: (nome) => `${nome}, em 10 min na loja liberamos o OK do boleto e você já escolhe o aparelho. Diz um dia que eu te coloco na agenda, sem fila. 💜`,
//     120: (nome) => `Se conseguir passar hoje ou amanhã, sai daqui aprovado(a) e tranquilo(a). Prefere manhã ou tarde? Me fala que separo o horário. 🙂`,
//     1140: (nome) => `Imagino a correria do dia, ${nome}. Amanhã cedo posso te atender rapidinho e deixar o crédito pronto. Quer que eu reserve esse horário pra você?`
//   },

//   agente_de_demonstração_por_boleto: {
//     mensagem_inicial: (nome) => `📌 ${nome}, posso sugerir outros modelos com boleto se quiser!`,
//     15: (nome) => `${nome}, as entradas e parcelas que te mostrei continuam válidas. Passando aqui, em 10 min deixo seu crédito pronto. Qual dia fica melhor pra você vir? 💜`,
//     40: (nome) => `Só pra lembrar: com RG, CPF e endereço em mãos a aprovação sai na hora e você já escolhe o modelo. Consegue encaixar uma visita esta semana?`,
//     120: (nome) => `Se chegar pela manhã ou à tarde, separo o balcão só pra você. Prefere qual período pra fechar o boleto sem fila?`,
//     1140: (nome) => `Já em casa, ${nome}? Amanhã cedo posso cuidar de tudo rapidinho e você sai aprovado(a). Me avisa se quer esse horário que deixo reservado. 💬`
//   },

//   agente_de_demonstracao_por_nome_por_boleto: {
//     mensagem_inicial: (nome) => `💡 ${nome}, ficou com alguma dúvida sobre os modelos? Posso te mostrar outras opções ou ajudar na escolha.`,
//     15: (nome) => `${nome}, viu os valores? É rapidinho: você passa na loja, dou entrada no boleto e pronto—já pode escolher o aparelho. Qual dia passa por aqui? 😉`,
//     40: (nome) => `Opa ${nome}, Sei que o dia corre, mas são só uns 10 min no balcão pra sair com crédito aprovado. Me diz um dia que deixo tudo esquematizado pra você.`,
//     120: (nome) => `${nome}, tenho dois horários livres, manhã e tarde. Qual encaixa melhor? Assim já evito fila e agilizo teu celular novo.`,
//     1140: (nome) => `Chegou em casa? Ótimo momento pra marcar: passo teu nome na agenda pra amanhã e resolvemos isso antes do café esfriar. Topa?`
//   },

//   agente_de_demonstracao_pos_decisao_por_boleto: {
//     mensagem_inicial: (nome) => `📲 ${nome}, conseguiu decidir qual modelo mais gostou? Se quiser, posso te ajudar a comparar.`,
//     etapas: {
//       1: (nome) => `${nome}, já te mandei as condições 💰. Ficou bom pra você? Se sim, quando consegue vir à loja? 🏬`,
//       2: (nome) => `Opa, ${nome}! Ainda estou por aqui se precisar de algo 😉`,
//       3: (nome) => `${nome}, me dá um retorno, por favor 🙏. Com uma entrada, você já sai de telefone zero 📱`,
//       4: () => `Só pra lembrar, continuo à disposição! 💜`
//     }
//   },
  


//   // Continua com os demais stages conforme especificado no documento...
// };

// // Converte milissegundos para minutos inteiros
// const minutosDeInatividade = (ms) => Math.floor(ms / (60 * 1000));

// // Pega o template correto baseado nos minutos passados
// const getMensagemPorTempo = (stage, minutos, nome) => {
//   const opcoes = mensagensDeRemarketing[stage];
//   if (!opcoes) return null;

//   if (minutos >= 3 && minutos < 10 && opcoes[3]) return opcoes[3].replace("{nome}", nome);
//   if (minutos >= 10 && minutos < 40 && opcoes[10]) return opcoes[10].replace("{nome}", nome);
//   if (minutos >= 40 && minutos < 120 && opcoes[40]) return opcoes[40].replace("{nome}", nome);

//   return null;
// };

// const remarketingFollowup = async () => {
//   const usuarios = await getTodosUsuariosComStageESemInteracao();
//   const agora = Date.now();

//   for (const usuario of usuarios) {
//     const { sender, stage, ultimaInteracao } = usuario;
//     const tempoParadoMs = agora - new Date(ultimaInteracao).getTime();
//     const minutos = minutosDeInatividade(tempoParadoMs);

//     if (tempoParadoMs < 3 * 60 * 1000) continue;

//     const nome = await getNomeUsuario(sender);
//     const historico = await getConversation(sender);
//     const ultimaMensagem = historico[historico.length - 1]?.conteudo || "";

//     if (ultimaMensagem.includes("remarketing:")) continue;

//     const mensagem = getMensagemPorTempo(stage, minutos, nome);
//     if (!mensagem) continue;

//     await sendBotMessage(sender, mensagem);
//   }
// };

// module.exports = { remarketingFollowup };