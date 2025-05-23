const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "meuSegredoSuperSecreto";

const autenticarToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // formato: Bearer token

  if (!token) return res.status(401).json({ error: "Token não fornecido" });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token inválido" });

    req.user = user; // user = { id, email }
    next();
  });
};

module.exports = autenticarToken;
