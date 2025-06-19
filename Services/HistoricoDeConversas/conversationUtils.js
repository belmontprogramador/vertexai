const { getConversation } = require("./conversationManager");

const getMensagensPorTipo = async (sender, tipoPrefixo) => {
  const historico = await getConversation(sender);
  return historico.filter((msg) => typeof msg === "string" && msg.startsWith(`${tipoPrefixo}:`));
};

module.exports = {
  getMensagensPorTipo
};
