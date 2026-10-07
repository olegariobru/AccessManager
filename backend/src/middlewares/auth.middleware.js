const sessions = require("../security/session");
const userRepository = require("../repositories/user.repository");

async function authMiddleware(req, res, next) {
  try {
    const session = req.session || await sessions.load(req);
    if (!session?.userId) return res.status(401).json({ error: "Sessão não autenticada" });
    const user = await userRepository.getAccessContext(session.userId);
    if (!user || session.tokenVersion !== user.tokenVersion) {
      await sessions.remove(req.sessionId);
      sessions.clearCookie(res);
      return res.status(401).json({ error: "Sessão inválida ou encerrada" });
    }
    req.user = user;
    // req.path é relativo ao router: a restrição também vale para chamadas diretas à API.
    const allowed = ["/me", "/profile", "/change-password", "/logout"];
    if (user.mustChangePassword && !(req.baseUrl === "/auth" && allowed.includes(req.path))) {
      return res.status(403).json({ error: "Altere sua senha antes de continuar", code: "PASSWORD_CHANGE_REQUIRED" });
    }
    return next();
  } catch (error) { return next(error); }
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
  if (normalizedEmail.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
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
