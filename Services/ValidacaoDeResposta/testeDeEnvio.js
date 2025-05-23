const { sendBotMessage } = require("../messageSender");
const { getAllCelulares } = require("../dbService"); // já exportado e pronto

const testeDeEnvio = async ({ sender, msgContent, pushName }) => {
  try {
    const celulares = await getAllCelulares();

    if (!celulares || celulares.length === 0) {
      await sendBotMessage(sender, "⚠️ Nenhum modelo encontrado no banco de dados.");
      return;
    }

    for (const modelo of celulares) {
      const mensagem = `🔥 *${modelo.nome}* \n\n${modelo.subTitulo}\n\n${modelo.descricao}\n\n${modelo.fraseImpacto}💜\n\n💵 *${modelo.precoParcelado}*\n\nPreço: R$${modelo.preco}`;

      await sendBotMessage(sender, {
        imageUrl: modelo.imageURL,
        caption: mensagem
      });
    }

    console.log("✅ Mensagens enviadas com sucesso para:", sender);
  } catch (error) {
    console.error("❌ Erro ao enviar modelos:", error);
    await sendBotMessage(sender, "❌ Ocorreu um erro ao buscar os modelos no banco.");
  }
};

module.exports = { testeDeEnvio };
