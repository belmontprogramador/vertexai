const axios = require("axios");

const getTemplatesAprovados = async (req, res) => {
  try {
    const { META_WABA_ID, META_GRAPH_VERSION, META_TOKEN } = process.env;

    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${META_WABA_ID}/message_templates`;

    const { data } = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${META_TOKEN}`,
      },
    });

    // Filtra apenas os templates aprovados
    const aprovados = data.data.filter(template => template.status === "APPROVED");

    res.json({
      total: aprovados.length,
      templates: aprovados.map(t => ({
        name: t.name,
        language: t.language,
        category: t.category,
        sub_category: t.sub_category || null,
        id: t.id,
        components: t.components,
      })),
    });
  } catch (err) {
    console.error("Erro ao buscar templates:", err.response?.data || err.message);
    res.status(500).json({ error: "Erro ao buscar templates aprovados." });
  }
};

module.exports = { getTemplatesAprovados };
