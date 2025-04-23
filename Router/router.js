const express = require("express");
 

const { webhookControllerReceived } = require("../Controller/webhookControllerReceived"); 
const { webhookControllerSent } = require("../Controller/webhookControllerSent");
const { refreshToken } = require("../Controller/blingTokenController");

 

const router = express.Router();  

router.post("/webhookreceived", webhookControllerReceived);
router.post("/webhooksent", webhookControllerSent);
router.get("/bling/refresh-token", refreshToken);

 router.get("/", (req, res) => {
  res.send("Hello, World!");
});

 

module.exports = router;

