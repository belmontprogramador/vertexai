const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const storeReceivedMessage = async ({ senderId, messageId, pushName, content, embedding, additionalData }) => {
  try {
    const userMessage = await prisma.userMessage.create({
      data: {
        id: messageId,
        senderId,
        pushName,
        conversation: content || "Mensagem sem texto",   
        embedding: embedding || [],
        additionalData: additionalData || {},
      },
    });

    console.log("✅ Mensagem armazenada com sucesso:");
    return userMessage;
  } catch (error) {
    console.error("❌ Erro ao armazenar mensagem no banco:", error);
  }
};



// 🔹 Função para armazenar mensagem enviada (humano ou IA)
const storeSentMessage = async ({ messageId, senderId, verifiedBizName, recipientId, content, embedding, isAI }) => {
  try {
    const sentMessage = await prisma.sentMessage.create({
      data: {
        id: messageId,
        senderId,
        verifiedBizName,
        recipientId,
        content: content || "Mensagem sem texto",
        embedding: embedding || [],
        isAI,
      },
    });

    console.log("✅ Mensagem enviada armazenada com sucesso:");
    return sentMessage;
  } catch (error) {
    console.error("❌ Erro ao armazenar mensagem enviada no banco:", error);
  }
};


 

/**
* 🔍 Obtém uma mensagem recebida por ID
*/
const getUserMessageById = async (id) => {
  return await prisma.userMessage.findUnique({
      where: { id }
  });
};

/**
* 🔍 Obtém mensagens recebidas por senderId (número do WhatsApp)
*/
const getUserMessagesBySenderId = async (senderId) => {
  return await prisma.userMessage.findMany({
      where: { senderId }
  });
};

/**
* 📤 Obtém todas as mensagens enviadas (SentMessage)
*/
const getAllSentMessages = async () => {
  return await prisma.sentMessage.findMany();
};

/**
* 📤 Obtém uma mensagem enviada por ID
*/
const getSentMessageById = async (id) => {
  return await prisma.sentMessage.findUnique({
      where: { id }
  });
};

/**
* 📤 Obtém mensagens enviadas por senderId (número do WhatsApp)
*/
const getSentMessagesBySenderId = async (senderId) => {
  return await prisma.sentMessage.findMany({
      where: { senderId }
  });
};

/**
* 📌 Obtém todas as instruções embutidas (InstructionEmbedding)
*/
const getAllInstructionEmbeddings = async () => {
  return await prisma.instructionEmbedding.findMany();
};

/**
* 📌 Obtém uma instrução embutida por ID
*/
const getInstructionEmbeddingById = async (id) => {
  return await prisma.instructionEmbedding.findUnique({
      where: { id }
  });
};

async function getAllUserMessages() {
  try {
    const messages = await prisma.userMessage.findMany();
    return messages;
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);
    throw new Error("Erro ao buscar mensagens do banco de dados");
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 📥 Cria um novo celular
 */
const createCelular = async (data) => {
  try {
    const novoCelular = await prisma.celular.create({ data });
    console.log("✅ Celular criado com sucesso:", novoCelular);
    return novoCelular;
  } catch (error) {
    console.error("❌ Erro ao criar celular:", error);
    throw error;
  }
};

/**
 * 🔍 Busca todos os celulares
 */
const getAllCelulares = async () => {
  try {
    return await prisma.celular.findMany();
  } catch (error) {
    console.error("❌ Erro ao buscar celulares:", error);
    throw error;
  }
};

/**
 * 🔍 Busca um celular por ID
 */
const getCelularById = async (id) => {
  try {
    return await prisma.celular.findUnique({
      where: { id: Number(id) },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar celular:", error);
    throw error;
  }
};

/**
 * ✏️ Atualiza um celular
 */
const updateCelular = async (id, data) => {
  try {
    return await prisma.celular.update({
      where: { id: Number(id) },
      data,
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar celular:", error);
    throw error;
  }
};

/**
 * ❌ Deleta um celular
 */
const deleteCelular = async (id) => {
  try {
    return await prisma.celular.delete({
      where: { id: Number(id) },
    });
  } catch (error) {
    console.error("❌ Erro ao deletar celular:", error);
    throw error;
  }
};

const createCelularBoleto = async (data) => {
  try {
    const novoCelular = await prisma.celularBoleto.create({ data });
    console.log("✅ CelularBoleto criado com sucesso:", novoCelular);
    return novoCelular;
  } catch (error) {
    console.error("❌ Erro ao criar CelularBoleto:", error);
    throw error;
  }
};

/**
 * 🔍 Busca todos os celularesBoleto
 */
const getAllCelulareBoleto = async () => {
  try {
    const dados = await prisma.celularBoleto.findMany()     
    return dados
  } catch (err) {
    console.error("❌ Erro direto ao acessar celularBoleto:", err)
  }
};

/**
 * 🔍 Busca um celularBoleto por ID
 */
const getCelularBoletoById = async (id) => {
  try {
    return await prisma.celularBoleto.findUnique({
      where: { id: Number(id) },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar CelularBoleto:", error);
    throw error;
  }
};

/**
 * ✏️ Atualiza um celularBoleto
 */
const updateCelularBoleto = async (id, data) => {
  try {
    return await prisma.celularBoleto.update({
      where: { id: Number(id) },
      data,
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar CelularBoleto:", error);
    throw error;
  }
};

/**
 * ❌ Deleta um celularBoleto
 */
const deleteCelularBoleto = async (id) => {
  try {
    return await prisma.celularBoleto.delete({
      where: { id: Number(id) },
    });
  } catch (error) {
    console.error("❌ Erro ao deletar CelularBoleto:", error);
    throw error;
  }
};

// 🔐 Criação de novo usuário
const createUser = async (req, res) => {
  try {
    const { name, email, senha } = req.body;

    // Verifica se o e-mail já está cadastrado
    const userExistente = await prisma.userSistem.findUnique({
      where: { email },
    });

    if (userExistente) {
      return res.status(400).json({ error: "E-mail já cadastrado" });
    }

    // Criptografa a senha antes de salvar
    const senhaCriptografada = await bcrypt.hash(senha, 10);

    const novoUsuario = await prisma.userSistem.create({
      data: {
        name,
        email,
        senha: senhaCriptografada,
      },
    });

    // Não retorna a senha para o cliente
    const { senha: _, ...userSemSenha } = novoUsuario;

    res.status(201).json(userSemSenha);
  } catch (err) {
    console.error("❌ Erro ao criar usuário:", err);
    res.status(500).json({ error: "Erro ao criar usuário", detail: err.message });
  }
};

// 📄 Lista todos os usuários
const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.userSistem.findMany();
    res.json(users);
  } catch (err) {
    console.error("Erro ao buscar usuários:", err);
    res.status(500).json({ error: "Erro ao buscar usuários", detail: err.message });
  }
};

// 🔍 Busca usuário por ID
const getUserById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await prisma.userSistem.findUnique({ where: { id } });

    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    res.json(user);
  } catch (err) {
    console.error("Erro ao buscar usuário:", err);
    res.status(500).json({ error: "Erro ao buscar usuário", detail: err.message });
  }
};

// ✏️ Atualiza usuário
const updateUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, email, senha } = req.body;

    const user = await prisma.userSistem.update({
      where: { id },
      data: { name, email, senha },
    });

    res.json(user);
  } catch (err) {
    console.error("Erro ao atualizar usuário:", err);
    res.status(500).json({ error: "Erro ao atualizar usuário", detail: err.message });
  }
};

// ❌ Deleta usuário
const deleteUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.userSistem.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    console.error("Erro ao deletar usuário:", err);
    res.status(500).json({ error: "Erro ao deletar usuário", detail: err.message });
  }
};

const SECRET = process.env.JWT_SECRET || "meuSegredoSuperSecreto";

const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    const user = await prisma.userSistem.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    const senhaOk = await bcrypt.compare(senha, user.senha);
    if (!senhaOk) return res.status(401).json({ error: "Senha incorreta" });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      mensagem: "Login realizado com sucesso",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      }
    });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ error: "Erro ao fazer login", detail: err.message });
  }
};

const createCelularVideo = async (data) => {
  try {
    const novo = await prisma.celularVideos.create({ data });
    console.log("✅ Vídeo de celular criado:", novo);
    return novo;
  } catch (error) {
    console.error("❌ Erro ao criar vídeo:", error);
    throw error;
  }
};

const getAllCelularVideos = async () => {
  try {
    return await prisma.celularVideos.findMany();
  } catch (error) {
    console.error("❌ Erro ao listar vídeos:", error);
    throw error;
  }
};

const getCelularVideoById = async (id) => {
  try {
    return await prisma.celularVideos.findUnique({
      where: { id: Number(id) },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar vídeo:", error);
    throw error;
  }
};

const updateCelularVideo = async (id, data) => {
  try {
    return await prisma.celularVideos.update({
      where: { id: Number(id) },
      data,
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar vídeo:", error);
    throw error;
  }
};

const deleteCelularVideo = async (id) => {
  try {
    return await prisma.celularVideos.delete({
      where: { id: Number(id) },
    });
  } catch (error) {
    console.error("❌ Erro ao deletar vídeo:", error);
    throw error;
  }
};

const createCelularVideoBoleto = async (data) => {
  try {
    const novo = await prisma.celularVideosBoleto.create({ data });
    console.log("✅ Vídeo Boleto criado:", novo);
    return novo;
  } catch (error) {
    console.error("❌ Erro ao criar vídeo Boleto:", error);
    throw error;
  }
};

const getAllCelularVideosBoleto = async () => {
  try {
    return await prisma.celularVideosBoleto.findMany();
  } catch (error) {
    console.error("❌ Erro ao buscar vídeos Boleto:", error);
    throw error;
  }
};

const getCelularVideoBoletoById = async (id) => {
  try {
    return await prisma.celularVideosBoleto.findUnique({
      where: { id: Number(id) },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar vídeo Boleto por ID:", error);
    throw error;
  }
};

const updateCelularVideoBoleto = async (id, data) => {
  try {
    return await prisma.celularVideosBoleto.update({
      where: { id: Number(id) },
      data,
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar vídeo Boleto:", error);
    throw error;
  }
};

const deleteCelularVideoBoleto = async (id) => {
  try {
    return await prisma.celularVideosBoleto.delete({
      where: { id: Number(id) },
    });
  } catch (error) {
    console.error("❌ Erro ao deletar vídeo Boleto:", error);
    throw error;
  }
};




module.exports = { storeReceivedMessage,
    storeSentMessage,
    getAllUserMessages,
    getUserMessageById,
    getUserMessagesBySenderId,
    getAllSentMessages,
    getSentMessageById,
    getSentMessagesBySenderId,
    getAllInstructionEmbeddings,
    getInstructionEmbeddingById,
    createCelular,
    getAllCelulares,
    getCelularById,
    updateCelular,
    deleteCelular,
    createCelularBoleto,
  getAllCelulareBoleto,
  getCelularBoletoById,
  updateCelularBoleto,
  deleteCelularBoleto,
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
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
  login
 };
