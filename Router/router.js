const express = require("express");
const { 
    storeInstruction
} = require("../Controller/instructionController"); 
const { storeEmbedding } = require("../Controller/insertEmbenddingsUsuario");
const { webhookController } = require("../Controller/webhookController"); 
const { processUserInput } = require("../Controller/instructionController");

 

const router = express.Router(); 

// Rota para perguntar ao ChatGPT usando o contexto do banco de dados
router.post("/ask-chatgpt", storeEmbedding);

router.post("/webhook", webhookController);

 router.get("/", (req, res) => {
  res.send("Hello, World!");
});

router.post("/process-input", processUserInput);

module.exports = router;

