const jwt = require("jsonwebtoken");

function validateCredentials(req, res, next) {
  const { email, password } = req.body || {};

  if (!email?.trim() || !password) {
    return res.status(400).json({
      error: "E-mail e senha são obrigatórios"
    });
  }

  return next();
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Token não fornecido"
    });
  }

  const parts = authHeader.trim().split(/\s+/);

  if (parts.length !== 2) {
    return res.status(401).json({
      error: "Token mal formatado"
    });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme) || !token) {
    return res.status(401).json({
      error: "Token mal formatado"
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET não configurado");

    return res.status(500).json({
      error: "Erro na configuração do servidor"
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    return next();
  } catch (error) {
    return res.status(401).json({
      error: "Token inválido ou expirado"
    });
  }
}

function authorizeRoles(...allowedRoles) {
  const roles = allowedRoles.map((role) =>
    String(role).trim().toUpperCase()
  );

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Usuário não autenticado"
      });
    }

    const userRole = String(req.user.role || "")
      .trim()
      .toUpperCase();

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: "Acesso não autorizado para este perfil"
      });
    }

    return next();
  };
}

module.exports = {
  validateCredentials,
  authMiddleware,
  authorizeRoles
};