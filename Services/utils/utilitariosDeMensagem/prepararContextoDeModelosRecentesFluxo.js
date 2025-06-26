const { getNomeUsuario } = require("../../redisService");
const { getConversation } = require("../../HistoricoDeConversas/conversationManager");
const { getAllCelulares } = require('../../dbService');

// ✅ Função normalize segura
const normalize = (str = "") =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();

async function prepararContextoDeModelosRecentesFluxo(sender) {
  const historico = await getConversation(sender);

  const conversaCompleta = historico
    .map(f => {
      try {
        const obj = typeof f === "string" ? JSON.parse(f) : f;
        const texto = typeof obj?.conteudo === "string" ? obj.conteudo : "";
        return texto.replace(/^again\s*/i, "").trim();
      } catch {
        return typeof f === "string" ? f.trim() : "";
      }
    })
    .slice(-20)
    .join(" | ");

  const modelosBanco = await getAllCelulares();
  const nomeUsuario = await getNomeUsuario(sender);

  const modelosRecentes = historico
    .map(msg => {
      try {
        const obj = typeof msg === "string" ? JSON.parse(msg) : msg;

        if (obj.tipo === "modelo_sugerido_json") return obj.conteudo;
        if (obj.tipo === "modelo_sugerido") {
          return typeof obj.conteudo === "string"
            ? { nome: obj.conteudo }
            : obj.conteudo;
        }
      } catch {
        if (typeof msg === "string" && msg.startsWith("modelo_sugerido: ")) {
          return { nome: msg.replace("modelo_sugerido: ", "") };
        }
      }
      return null;
    })
    .filter(Boolean);

  const mapaUnico = new Map();
  for (const modelo of modelosRecentes.reverse()) {
    const chave = normalize(modelo?.nome);
    if (chave && !mapaUnico.has(chave)) {
      mapaUnico.set(chave, modelo);
    }
  }

  const modelos = Array.from(mapaUnico.values())
    .map(mJson => {
      const modeloOriginal = modelosBanco.find(m => normalize(m.nome) === normalize(mJson?.nome));
      if (!modeloOriginal) return null;

      return {
        nome: modeloOriginal.nome,
        preco: modeloOriginal.preco,
        descricaoCurta: modeloOriginal.descricao,
        imagemURL: modeloOriginal.imageURL,
        precoParcelado: modeloOriginal.precoParcelado,
        fraseImpacto: modeloOriginal.fraseImpacto,
        subTitulo: modeloOriginal.subTitulo
      };
    })
    .filter(Boolean);

  const modelosConfirmados = historico
    .map(m => {
      try {
        const obj = typeof m === "string" ? JSON.parse(m) : m;
        return obj?.tipo === "modelo_confirmado" ? obj.conteudo : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (modelos.length === 0 && modelosConfirmados.length > 0) {
    for (const nome of modelosConfirmados.reverse()) {
      const modeloOriginal = modelosBanco.find(m => normalize(m.nome) === normalize(nome));
      if (modeloOriginal) {
        modelos.push({
          nome: modeloOriginal.nome,
          preco: modeloOriginal.preco,
          descricaoCurta: modeloOriginal.descricao,
          imagemURL: modeloOriginal.imageURL,
          precoParcelado: modeloOriginal.precoParcelado,
          fraseImpacto: modeloOriginal.fraseImpacto,
          subTitulo: modeloOriginal.subTitulo
        });
      }
    }
  }

  console.log(`vindo de dentro do contexto ${modelosConfirmados}`);
  console.log("🧠 Modelos final preparados:", modelos.map(m => m.nome));

  return {
    modelos,
    nomeUsuario,
    conversaCompleta,
    modelosConfirmados
  };
}

module.exports = { prepararContextoDeModelosRecentesFluxo };
