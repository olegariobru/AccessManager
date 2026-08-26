const userRepository = require("../repositories/user.repository");
const passwordResetRepository = require("../repositories/password-reset.repository");
const mailService = require("./mail_services");
const { hashPassword } = require("../utils/hash");

const REQUEST_TTL_MS = 24 * 60 * 60 * 1000;

async function requestPasswordReset(email, requesterIp) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return;

  const user = await userRepository.findByEmail(normalizedEmail);
  if (!user || user.status !== "ACTIVE" || user.deletedAt) return;

  let request = await passwordResetRepository.findPendingByUserId(user.id);
  if (request?.notificationSentAt) return;

  if (!request) {
    request = await passwordResetRepository.create({
      userId: user.id,
      requesterIp,
      expiresAt: new Date(Date.now() + REQUEST_TTL_MS),
    });
  }

  const administrators = await passwordResetRepository.findActiveAdministrators();
  await mailService.sendPasswordResetRequest({ administrators, user, request });
  await passwordResetRepository.markNotificationSent(request.id);
}

async function listPendingRequests() {
  return passwordResetRepository.listPending();
}

async function resetPasswordByAdmin(actor, payload = {}) {
  const password = String(payload.password || "");
  if (password.length < 12 || password.length > 128) {
    const error = new Error("A senha temporária deve ter entre 12 e 128 caracteres");
    error.statusCode = 400;
    throw error;
  }
  const user = await passwordResetRepository.resetPasswordByAdmin({
    userId: payload.userId,
    requestId: payload.requestId || null,
    passwordHash: await hashPassword(password),
    administratorId: actor.id,
  });
  if (!user) {
    const error = new Error("Usuário ativo não encontrado");
    error.statusCode = 404;
    throw error;
  }
  return user;
}

module.exports = { requestPasswordReset, listPendingRequests, resetPasswordByAdmin };
