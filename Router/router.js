const express = require("express");
const { 
    storeInstruction
} = require("../Controller/instructionController"); 
const { storeEmbedding } = require("../Controller/insertEmbenddingsUsuario");
const { webhookControllerReceived } = require("../Controller/webhookControllerReceived"); 
const { processUserInput } = require("../Controller/instructionController");
const { webhookControllerSent } = require("../Controller/webhookControllerSent");

 

const router = express.Router(); 

// Rota para perguntar ao ChatGPT usando o contexto do banco de dados
router.post("/ask-chatgpt", storeEmbedding);

router.post("/webhookreceived", webhookControllerReceived);

router.post("/webhooksent", webhookControllerSent);

 router.get("/", (req, res) => {
  res.send("Hello, World!");
});

router.post("/process-input", processUserInput);

module.exports = router;

