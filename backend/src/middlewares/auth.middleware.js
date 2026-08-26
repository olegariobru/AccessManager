const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/user.repository");

async function authMiddleware(req, res, next) {
  const parts = String(req.headers.authorization || "").trim().split(/\s+/);
  if (parts.length !== 2 || !/^Bearer$/i.test(parts[0]) || !parts[1]) {
    return res.status(401).json({ error: "Token não fornecido ou mal formatado" });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: "Erro na configuração do servidor" });
  }

  try {
    const decoded = jwt.verify(parts[1], process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    const user = await userRepository.getAccessContext(decoded.id);
    if (!user || decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ error: "Usuário inativo ou sem perfil válido" });
    }
    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }
    return next(error);
  }
}

function authorizeRoles(...allowedRoles) {
  const roles = allowedRoles.map((role) => String(role).trim().toUpperCase());
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Usuário não autenticado" });
    const userRoles = req.user.roles || [req.user.role];
    if (!userRoles.some((role) => roles.includes(String(role).toUpperCase()))) {
      return res.status(403).json({ error: "Acesso não autorizado para este perfil" });
    }
    return next();
  };
}

function authorizeHumanResources(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Usuário não autenticado" });
  if (!req.user.isHr && req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Acesso exclusivo para integrantes do RH" });
  }
  return next();
}

function authorizeDocumentPublisher(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Usuário não autenticado" });
  if (!req.user.isDocumentPublisher) {
    return res.status(403).json({
      error: "Publicação exclusiva para integrantes do RH ou da Contabilidade",
    });
  }
  return next();
}

function authorizeClientDirectory(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Usuário não autenticado" });
  if (req.user.role !== "ADMIN" && !req.user.isDocumentPublisher) {
    return res.status(403).json({ error: "Acesso não autorizado à lista de clientes" });
  }
  return next();
}

function validateCredentials(req, res, next) {
  const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();
  const password = req.body?.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: "E-mail inválido" });
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: "A senha deve ter entre 8 e 128 caracteres" });
  }
  req.body.email = normalizedEmail;
  return next();
}

module.exports = {
  authMiddleware,
  authorizeRoles,
  authorizeHumanResources,
  authorizeDocumentPublisher,
  authorizeClientDirectory,
  validateCredentials,
};
