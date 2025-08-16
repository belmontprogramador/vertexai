const express = require("express");
 

const { webhookControllerReceived } = require("../Controller/webhookControllerReceived"); 
const { webhookControllerSent } = require("../Controller/webhookControllerSent");
const { refreshToken } = require("../Controller/blingTokenController");
const autenticarToken = require("../Services/GerenciadorDeRotinas/middlewares/authMiddleware");
const { validarNumerosEmLoteController } = require ("../controller/validarNumerosController")
const webhookController = require("../Controller/webhookController");


const {
  createCelular,
  getAllCelulares,
  getCelularById,
  updateCelular,
  deleteCelular,
} = require("../Services/dbService"); // ajuste o path se necessário

const {
  createCelularBoleto,
  getAllCelulareBoleto,
  getCelularBoletoById,
  updateCelularBoleto,
  deleteCelularBoleto,
} = require("../Services/dbService");

const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} = require("../Services/dbService");

const { login } = require("../Services/dbService");



const {
  createCelularVideo,
  getAllCelularVideos,
  getCelularVideoById,
  updateCelularVideo,
  deleteCelularVideo,
  createCelularVideoBoleto,
  getAllCelularVideosBoleto,
  getCelularVideoBoletoById,
  updateCelularVideoBoleto,
  deleteCelularVideoBoleto,
} = require("../Services/dbService");

const { redirecionarParaWhatsApp } = require("../Controller/redirect.controller");
// const { webhookKommo } = require("../Controller/webhookControllerKommo");

const { redirecionarParaExclusao } = require("../Controller/redirecionarParaExclusao")
const { enviarNotaFiscalTemplate } = require("../Controller/whatsappController");
const { getTemplatesAprovados } = require("../Controller/whatsappControllerCampanhaBoleto");
const { receberWebhook } = require("../Controller/teste");
const { webhookKommoSalesbot } = require("../Controller/kommoWebhook.controller");
 



const router = express.Router();

router.post("/webhook/kommo-salesbot", webhookKommoSalesbot);

router.get("/whatsapp/templates-aprovados", getTemplatesAprovados);

 
router.post('/webhooktest', receberWebhook)

// router.post("/webhook/kommo", webhookKommo);
router.get("/excluir-lead", redirecionarParaExclusao);

// 📤 Envio de template WhatsApp via Kommo
router.post("/enviar-nota", enviarNotaFiscalTemplate);


router.get("/webhook", webhookController.verifyWebhook);
router.post("/webhook", webhookController.receiveWebhook);

router.get("/credito-boleto", redirecionarParaWhatsApp);

router.post("/webhookreceived", webhookControllerReceived);
router.post("/webhooksent", webhookControllerSent);
router.get("/bling/refresh-token", refreshToken);

 router.get("/", (req, res) => {
  res.send("Hello, World!");
});

// 📱 Rotas CRUD de Celular
router.post("/celulares", autenticarToken,async (req, res) => {
  try {
    const celular = await createCelular(req.body);
    res.status(201).json(celular);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar celular", detail: err.message });
  }
});

router.get("/celulares", autenticarToken,async (req, res) => {
  try {
    const celulares = await getAllCelulares();
    res.json(celulares);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar celulares", detail: err.message });
  }
});

router.get("/celulares/:id", autenticarToken, async (req, res) => {
  try {
    const celular = await getCelularById(req.params.id);
    if (!celular) return res.status(404).json({ error: "Celular não encontrado" });
    res.json(celular);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar celular", detail: err.message });
  }
});

router.put("/celulares/:id", autenticarToken,async (req, res) => {
  try {
    const celular = await updateCelular(req.params.id, req.body);
    res.json(celular);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar celular", detail: err.message });
  }
});

router.delete("/celulares/:id", autenticarToken, async (req, res) => {
  try {
    await deleteCelular(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar celular", detail: err.message });
  }
});


router.post("/celularBoleto", autenticarToken,async (req, res) => {
  try {
    const celularBoleto = await createCelularBoleto(req.body);
    res.status(201).json(celularBoleto);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar celularBoleto", detail: err.message });
  }
});

router.get("/celularBoleto", autenticarToken, async (req, res) => {
  try {
    const boletos = await getAllCelulareBoleto();
    res.json(boletos);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar celularBoletos", detail: err.message });
  }
});

router.get("/celularBoleto/:id", autenticarToken,async (req, res) => {
  try {
    const boleto = await getCelularBoletoById(req.params.id);
    if (!boleto) return res.status(404).json({ error: "CelularBoleto não encontrado" });
    res.json(boleto);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar celularBoleto", detail: err.message });
  }
});

router.put("/celularBoleto/:id", autenticarToken, async (req, res) => {
  try {
    const boleto = await updateCelularBoleto(req.params.id, req.body);
    res.json(boleto);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar celularBoleto", detail: err.message });
  }
});

router.delete("/celularBoleto/:id", autenticarToken, async (req, res) => {
  try {
    await deleteCelularBoleto(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar celularBoleto", detail: err.message });
  }
});

router.post("/userSistem", createUser);
router.get("/userSistem", getAllUsers);
router.get("/userSistem/:id", getUserById);
router.put("/userSistem/:id", updateUser);
router.delete("/userSistem/:id", deleteUser);

router.post("/userSistem/login", login);

// 📽️ Rotas CRUD de CelularVideos
router.post("/celularVideos", autenticarToken, async (req, res) => {
  try {
    const novo = await createCelularVideo(req.body);
    res.status(201).json(novo);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar vídeo", detail: err.message });
  }
});

router.get("/celularVideos", autenticarToken, async (req, res) => {
  try {
    const videos = await getAllCelularVideos();
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar vídeos", detail: err.message });
  }
});

router.get("/celularVideos/:id", autenticarToken, async (req, res) => {
  try {
    const video = await getCelularVideoById(req.params.id);
    if (!video) return res.status(404).json({ error: "Vídeo não encontrado" });
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar vídeo", detail: err.message });
  }
});

router.put("/celularVideos/:id", autenticarToken, async (req, res) => {
  try {
    const video = await updateCelularVideo(req.params.id, req.body);
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar vídeo", detail: err.message });
  }
});

router.delete("/celularVideos/:id", autenticarToken, async (req, res) => {
  try {
    await deleteCelularVideo(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar vídeo", detail: err.message });
  }
});

// 🎞️ Rotas CRUD de CelularVideosBoleto
router.post("/celularVideosBoleto", autenticarToken, async (req, res) => {
  try {
    const novo = await createCelularVideoBoleto(req.body);
    res.status(201).json(novo);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar vídeo Boleto", detail: err.message });
  }
});

router.get("/celularVideosBoleto", autenticarToken, async (req, res) => {
  try {
    const videos = await getAllCelularVideosBoleto();
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar vídeos Boleto", detail: err.message });
  }
});

router.get("/celularVideosBoleto/:id", autenticarToken, async (req, res) => {
  try {
    const video = await getCelularVideoBoletoById(req.params.id);
    if (!video) return res.status(404).json({ error: "Vídeo Boleto não encontrado" });
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar vídeo Boleto", detail: err.message });
  }
});

router.put("/celularVideosBoleto/:id", autenticarToken, async (req, res) => {
  try {
    const video = await updateCelularVideoBoleto(req.params.id, req.body);
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar vídeo Boleto", detail: err.message });
  }
});

router.delete("/celularVideosBoleto/:id", autenticarToken, async (req, res) => {
  try {
    await deleteCelularVideoBoleto(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar vídeo Boleto", detail: err.message });
  }
});


router.post('/validar-numeros-em-lote', validarNumerosEmLoteController);

 

module.exports = router;

