const test = require("node:test");
const assert = require("node:assert/strict");
const userRepository = require("../src/repositories/user.repository");
const passwordResetRepository = require("../src/repositories/password-reset.repository");
const mailService = require("../src/services/mail_services");
const passwordResetService = require("../src/services/password-reset.services");

function stubDependencies(t, overrides = {}) {
  const originals = {
    findByEmail: userRepository.findByEmail,
    findPendingByUserId: passwordResetRepository.findPendingByUserId,
    create: passwordResetRepository.create,
    findActiveAdministrators: passwordResetRepository.findActiveAdministrators,
    markNotificationSent: passwordResetRepository.markNotificationSent,
    listPending: passwordResetRepository.listPending,
    resetPasswordByAdmin: passwordResetRepository.resetPasswordByAdmin,
    sendPasswordResetRequest: mailService.sendPasswordResetRequest,
  };
  t.after(() => {
    userRepository.findByEmail = originals.findByEmail;
    passwordResetRepository.findPendingByUserId = originals.findPendingByUserId;
    passwordResetRepository.create = originals.create;
    passwordResetRepository.findActiveAdministrators = originals.findActiveAdministrators;
    passwordResetRepository.markNotificationSent = originals.markNotificationSent;
    passwordResetRepository.listPending = originals.listPending;
    passwordResetRepository.resetPasswordByAdmin = originals.resetPasswordByAdmin;
    mailService.sendPasswordResetRequest = originals.sendPasswordResetRequest;
  });
  Object.assign(userRepository, overrides.userRepository);
  Object.assign(passwordResetRepository, overrides.passwordResetRepository);
  Object.assign(mailService, overrides.mailService);
}

test("solicitação cria registro e envia e-mail aos administradores", async (t) => {
  let created;
  let notification;
  let markedId;
  const user = { id: 7, name: "Usuário Teste", email: "user@example.com", status: "ACTIVE" };
  const administrators = [{ id: 1, name: "Admin", email: "admin@example.com" }];

  stubDependencies(t, {
    userRepository: { findByEmail: async () => user },
    passwordResetRepository: {
      findPendingByUserId: async () => null,
      create: async (payload) => {
        created = payload;
        return { id: "request-id", requestedAt: new Date(), ...payload };
      },
      findActiveAdministrators: async () => administrators,
      markNotificationSent: async (id) => { markedId = id; },
    },
    mailService: { sendPasswordResetRequest: async (payload) => { notification = payload; } },
  });

  await passwordResetService.requestPasswordReset(" USER@EXAMPLE.COM ", "127.0.0.1");

  assert.equal(created.userId, 7);
  assert.equal(created.requesterIp, "127.0.0.1");
  assert.equal(notification.user, user);
  assert.equal(notification.administrators, administrators);
  assert.equal(markedId, "request-id");
});

test("solicitação para e-mail inexistente não cria registro nem envia mensagem", async (t) => {
  let called = false;
  stubDependencies(t, {
    userRepository: { findByEmail: async () => null },
    passwordResetRepository: { create: async () => { called = true; } },
    mailService: { sendPasswordResetRequest: async () => { called = true; } },
  });

  await passwordResetService.requestPasswordReset("missing@example.com", "127.0.0.1");
  assert.equal(called, false);
});

test("solicitação pendente já notificada não envia e-mail duplicado", async (t) => {
  let called = false;
  stubDependencies(t, {
    userRepository: {
      findByEmail: async () => ({ id: 7, status: "ACTIVE", deletedAt: null }),
    },
    passwordResetRepository: {
      findPendingByUserId: async () => ({ id: "existing", notificationSentAt: new Date() }),
    },
    mailService: { sendPasswordResetRequest: async () => { called = true; } },
  });

  await passwordResetService.requestPasswordReset("user@example.com", "127.0.0.1");
  assert.equal(called, false);
});

test("administrador redefine senha com hash e conclui a solicitação", async (t) => {
  let payload;
  stubDependencies(t, {
    passwordResetRepository: {
      resetPasswordByAdmin: async (value) => { payload = value; return { id: 7 }; },
    },
  });

  await passwordResetService.resetPasswordByAdmin(
    { id: 1, role: "ADMIN" },
    { userId: 7, requestId: "request-id", password: "Temporaria@123" },
  );
  assert.equal(payload.userId, 7);
  assert.equal(payload.requestId, "request-id");
  assert.equal(payload.administratorId, 1);
  assert.notEqual(payload.passwordHash, "Temporaria@123");
});

test("redefinição administrativa rejeita senha temporária curta", async () => {
  await assert.rejects(
    () => passwordResetService.resetPasswordByAdmin({ id: 1 }, { userId: 7, password: "curta" }),
    (error) => error.statusCode === 400,
  );
});
