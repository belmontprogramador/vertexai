const { sendBotMessage } = require("./messageSender");
const { getLastInteraction, setUserStage, getUserStage, setLastInteraction } = require("./redisService");
const { rotinaDeAtedimento } = require("../Services/GerenciadorDeRotinas/rotinaDeAtendimento");
const { rotinaDeSondagem } = require("../Services/GerenciadorDeRotinas/rotinaDeSondagem")

const checagemInicial = async (sender, msgContent) => {
    const cleanedContent = msgContent.replace(/^again\s*/i, "").trim().toLowerCase();
    const lastInteraction = await getLastInteraction(sender);
    const currentTime = Date.now();
    const CHECK_TIME_LIMIT = 1 * 60 * 1000;
    await setLastInteraction(sender, currentTime);
    const avanço = await getUserStage(sender)

    // 🔄 Caso o tempo tenha expirado, inicia reinício
    if (!lastInteraction || currentTime - lastInteraction > CHECK_TIME_LIMIT) {
        await setUserStage(sender, "reinicio_de_atendimento");
        console.log(`⏳ [DEBUG] Tempo expirado. Stage setado: reinicio_de_atendimento`);
    }

    // Se dentro do tempo e usuário respondeu
    const avanco = await getUserStage(sender);

// 🔄 Caso o tempo tenha expirado, inicia reinício
if (!lastInteraction || currentTime - lastInteraction > CHECK_TIME_LIMIT) {
  await setUserStage(sender, "reinicio_de_atendimento");
  console.log(`⏳ [DEBUG] Tempo expirado. Stage setado: reinicio_de_atendimento`);
}

// ⏱️ Se dentro do tempo e usuário respondeu
if (
    cleanedContent !== "sim" &&
    cleanedContent !== "não" &&
    cleanedContent !== "nao" &&
    avanco === "sequencia_de_atendimento"
  ) {
    console.log("✅ [DEBUG] Já está em sequência, mantendo stage.");
    // NADA A FAZER
  } else if (cleanedContent === "sim") {
    await setUserStage(sender, "sondagem");
    console.log(`✅ [DEBUG] Resposta SIM. Stage setado: sondagem`);
  } else if (cleanedContent === "não" || cleanedContent === "nao") {
    await setUserStage(sender, "continuar_de_onde_parou");
    console.log(`✅ [DEBUG] Resposta NÃO. Stage setado: continuar_de_onde_parou`);
  }
  


        // 🔁 Executa a rotina de acordo com o estágio atual
        const stage = await getUserStage(sender);
        console.log(`🎯 [DEBUG] Executando switch para stage: ${stage}`);

        switch (stage) {
            case "reinicio_de_atendimento":
                return await rotinaDeAtedimento(sender, cleanedContent);

            case "sondagem":
                await sendBotMessage(sender, "Perfeito! Vamos retomar seu atendimento 😄");
                return await rotinaDeSondagem(sender, cleanedContent);

            case "sequencia_de_atendimento":               
                return await rotinaDeSondagem(sender, cleanedContent);

            case "continuar_de_onde_parou":
                return await sendBotMessage(sender, "Perfeito! Vamos continuar de onde paramos 😄");

            default:
                console.log("⚠️ [DEBUG] Nenhum stage válido encontrado.");
                return await sendBotMessage(sender, "Não consegui identificar seu estágio 😕");
        }
    };

    module.exports = { checagemInicial };
