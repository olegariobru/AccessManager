const userService = require("../services/user.services");
const passwordResetService = require("../services/password-reset.services");

const { sendError } = require("../security/errors");
const sessions = require("../security/session");
const securityRepository = require("../repositories/security.repository");

async function csrf(req, res, next) {
  try {
    const session = await sessions.load(req) || await sessions.create(req, res);
    return res.json({ csrfToken: session.csrfToken });
  } catch (error) { return next(error); }
}

async function logout(req, res, next) {
  try {
    await securityRepository.audit({ actorId: req.user.id, action: "SESSION_ENDED", entityType: "User", entityId: req.user.id });
    await sessions.remove(req.sessionId);
    sessions.clearCookie(res);
    return res.status(204).end();
  } catch (error) { return next(error); }
}

async function login(req, res) {
  try {
    const { user } = await userService.login(req.body);
    await securityRepository.audit({ actorId: user.id, action: "LOGIN_SUCCEEDED", entityType: "User", entityId: user.id });
    const session = await sessions.create(req, res, user);
    return res.status(200).json({ user, csrfToken: session.csrfToken });
  } catch (error) {
    if (error.code === "INVALID_CREDENTIALS") console.warn(JSON.stringify({ event: "LOGIN_FAILED" }));
    return sendError(res, error, "E-mail ou senha inválidos");
  }
}

async function forgotPassword(req, res) {
  const message = "Se o e-mail estiver cadastrado, os administradores receberão a solicitação em instantes.";
  try {
    await passwordResetService.requestPasswordReset(req.body?.email, req.ip);
  } catch (error) {
    console.error(JSON.stringify({ event: "PASSWORD_RECOVERY_FAILED", code: error.code || "UNKNOWN" }));
  }
  return res.status(200).json({ message });
}

async function listPasswordResetRequests(_req, res) {
  try {
    return res.status(200).json({ requests: await passwordResetService.listPendingRequests() });
  } catch (error) { return sendError(res, error, "Erro ao listar solicitações de senha"); }
}

async function resetPasswordByAdmin(req, res) {
  try {
    const user = await passwordResetService.resetPasswordByAdmin(req.user, req.body);
    return res.status(200).json({ user, message: "Senha temporária definida com sucesso" });
  } catch (error) { return sendError(res, error, "Erro ao redefinir senha"); }
}

async function changePassword(req, res) {
  try {
    await userService.changeOwnPassword(req.user, req.body);
    await sessions.remove(req.sessionId);
    sessions.clearCookie(res);
    return res.status(200).json({ message: "Senha alterada com sucesso" });
  } catch (error) { return sendError(res, error, "Erro ao alterar senha"); }
}

async function listUsers(req, res) {
  try {
    return res.status(200).json({ users: await userService.listUsers(req.query.search) });
  } catch (error) {
    return sendError(res, error, "Erro ao listar usuários");
  }
}

async function me(req, res) {
  try {
    return res.status(200).json({ user: await userService.getUserById(req.user.id) });
  } catch (error) {
    return sendError(res, error, "Usuário não encontrado");
  }
}

async function updateUser(req, res) {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user);
    return res.status(200).json({ user });
  } catch (error) {
    return sendError(res, error, "Erro ao atualizar usuário");
  }
}

async function deleteUser(req, res) {
  try {
    await userService.deleteUser(req.params.id, req.user);
    return res.status(200).json({ message: "Usuário inativado com sucesso" });
  } catch (error) {
    return sendError(res, error, "Erro ao inativar usuário");
  }
}

async function createUser(req, res) {
  try {
    const user = await userService.createUserByAdmin(req.body, req.user);
    return res.status(201).json({ user });
  } catch (error) {
    return sendError(res, error, "Erro ao criar usuário");
  }
}

module.exports = {
  csrf,
  logout,
  login,
  forgotPassword,
  listPasswordResetRequests,
  resetPasswordByAdmin,
  changePassword,
  me,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
};
