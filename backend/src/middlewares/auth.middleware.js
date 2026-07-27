const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Token não fornecido"
    });
  }

  const parts = authHeader.trim().split(/\s+/);

  if (parts.length !== 2 || !parts[1]) {
    return res.status(401).json({
      error: "Token mal formatado"
    });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({
      error: "Token mal formatado"
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET não está configurado");
    return res.status(500).json({
      error: "Erro na configuração do servidor"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    return next();
  } catch (error) {
    return res.status(401).json({
      error: "Token inválido ou expirado"
    });
  }
}

function validateCredentials(req, res, next) {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ message: "E-mail inválido" });
  }

  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return res.status(400).json({ message: "A senha deve ter entre 8 e 128 caracteres" });
  }

  req.body.email = normalizedEmail;
  return next();
}

function authorizeRoles(...allowedRoles) {
  const roles = allowedRoles.map((role) => String(role).trim().toUpperCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Usuário não autenticado"
      });
    }

    const userRole = String(req.user.role || "").trim().toUpperCase();

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: "Acesso não autorizado para este perfil"
      });
    }

    return next();
  };
}

module.exports = {
  authMiddleware,
  authorizeRoles,
  validateCredentials
};
