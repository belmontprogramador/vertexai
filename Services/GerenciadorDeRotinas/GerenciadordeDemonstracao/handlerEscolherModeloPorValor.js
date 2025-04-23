// handlerEscolherModelo.js
const { storeChosenModel } = require("../../redisService");
const { identificarModeloEscolhido } = require("./ServicesOpenAiDemonstracao/identificarModeloEscolhido");

const handlerEscolherModeloPorValor = async ({ sender, msgContent, pushName }) => {
  // 🧠 Armazena o que o usuário escreveu como o modelo escolhido
  await storeChosenModel(sender, msgContent);

  // 👇 Chama a lógica de identificação com base nessa resposta
  return await identificarModeloEscolhido({ sender, msgContent, pushName });
};

module.exports = { handlerEscolherModeloPorValor };
