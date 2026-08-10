const test = require("node:test");
const assert = require("node:assert/strict");
const securityRepository = require("../src/repositories/security.repository");

test("auditoria salva identificação do ator e descrição legível", async () => {
  let persisted;
  const tx = {
    user: {
      findUnique: async () => ({ name: "Bruno Olegário", email: "bruno@example.com" }),
    },
    auditLog: {
      create: async ({ data }) => {
        persisted = data;
        return { id: 1n, ...data };
      },
    },
  };

  await securityRepository.audit({
    actorId: 7,
    action: "VACATION_APPROVED_BY_HR",
    entityType: "VacationRequest",
    entityId: 42,
    changes: { from: "PENDING_HR", to: "APPROVED" },
  }, tx);

  assert.equal(persisted.actorId, 7);
  assert.equal(persisted.actorName, "Bruno Olegário");
  assert.equal(persisted.actorEmail, "bruno@example.com");
  assert.equal(persisted.description, "Férias aprovadas pelo RH");
  assert.equal(persisted.entityId, "42");
});

test("auditoria preserva o ID quando o cadastro do ator não é encontrado", async () => {
  let persisted;
  const tx = {
    user: { findUnique: async () => null },
    auditLog: { create: async ({ data }) => { persisted = data; return data; } },
  };

  await securityRepository.audit({
    actorId: 99,
    action: "UNKNOWN_ACTION",
    entityType: "Test",
  }, tx);

  assert.equal(persisted.actorName, "Usuário #99");
  assert.equal(persisted.actorEmail, null);
  assert.equal(persisted.description, "unknown action");
});
