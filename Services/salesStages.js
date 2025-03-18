const { setUserStage } = require("./redisService");

const STAGES = [
    "abordagem",
    "sondagem_de_orcamento",
    "demonstracao_do_produto",
    "corrigir_objecoes",
    "forma_de_pagamento",
    "forma_de_entrega",
    "fechamento_da_venda"
];

/**
 * 🔍 Identifica o estágio do usuário com base na entrada de texto
 */
const getStageFromUserInput = (userInput, currentStage) => {
    userInput = userInput.toLowerCase();

    const keywords = {
        abordagem: ["oi", "olá", "bom dia", "boa tarde", "boa noite"],
        sondagem_de_orcamento: ["quanto custa", "qual o preço", "orçamento", "valor", "qual modelo disponível"],
        demonstracao_do_produto: ["como funciona", "me mostre", "tem fotos", "especificações"],
        corrigir_objecoes: ["tem desconto", "parcelamento", "vale a pena", "qual garantia"],
        forma_de_pagamento: ["pix", "boleto", "cartão", "parcelado"],
        forma_de_entrega: ["frete", "entrega", "envio"],
        fechamento_da_venda: ["quero comprar", "fechar pedido", "finalizar compra"]
    };

    for (const [stage, words] of Object.entries(keywords)) {
        if (words.some(keyword => userInput.includes(keyword))) {
            return stage;
        }
    }

    return currentStage; // Se não identificar um novo estágio, mantém o atual
};

/**
 * 🔄 Garante que o usuário não pule etapas e pode regredir se necessário
 */
const validateStageProgression = async (userId, detectedStage, currentStage) => {
    const currentIndex = STAGES.indexOf(currentStage);
    const detectedIndex = STAGES.indexOf(detectedStage);

    if (detectedIndex < currentIndex) {
        console.log(`🔄 O usuário ${userId} regrediu. Voltando para: ${detectedStage}`);
        await setUserStage(userId, detectedStage);
        return detectedStage;
    }

    if (detectedIndex > currentIndex + 1) {
        console.log(`🔄 O usuário ${userId} tentou pular etapas. Reposicionando para: ${STAGES[currentIndex + 1]}`);
        await setUserStage(userId, STAGES[currentIndex + 1]);
        return STAGES[currentIndex + 1];
    }

    return detectedStage;
};

module.exports = {
    STAGES,
    getStageFromUserInput,
    validateStageProgression
};
