const { getSelectedModel, storeChosenModel, setUserStage } = require("../../../../Services/redisService");
const  { agenteDeDemonstracaoDetalhada } = require("./agenteDeDemonstraçãoDetalhada")

function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, "")
    .toLowerCase();
}

function similaridade(fraseA, fraseB) {
  const a = normalizar(fraseA).split(" ");
  const b = normalizar(fraseB).split(" ");

  const comuns = a.filter(palavra => b.includes(palavra)).length;
  const mediaPalavras = (a.length + b.length) / 2;

  return comuns / mediaPalavras;
}

async function identificarModeloEscolhido({sender, pushName, msgContent }) {
  const modelosSalvos = await getSelectedModel(sender);

  if (!modelosSalvos) {
    console.log("⚠️ [DEBUG] Nenhum modelo sugerido encontrado no Redis.");
    return null;
  }

  const lista = modelosSalvos.split(" | ");
  let melhor = { nome: null, score: 0 };

  for (const modelo of lista) {
    const score = similaridade(msgContent, modelo);
    console.log(`🔎 Comparando com "${modelo}" - Score: ${score.toFixed(2)}`);
  
    if (score > melhor.score) {
      melhor = { nome: modelo, score };
    }
  }
  

  if (melhor.score >= 0.25) {
    await storeChosenModel(sender, melhor.nome);
    console.log("💾 [DEBUG] Modelo identificado e salvo no Redis (modelo_escolhido):", melhor.nome);     

    await setUserStage(sender,"agente_de_demonstração_detalhado")
    return await agenteDeDemonstracaoDetalhada({ sender, pushName, msgContent })

     
  }

  console.log("⚠️ [DEBUG] Nenhum modelo foi identificado com similaridade suficiente.");
  return null;
}

module.exports = { identificarModeloEscolhido };
