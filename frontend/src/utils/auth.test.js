import test from "node:test";
import assert from "node:assert/strict";
import { clearSession, getSession, normalizeRole, roleDestination, saveSession, updateSessionUser } from "./auth.js";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test.beforeEach(() => {
  globalThis.localStorage = createStorage();
  clearSession();
});

test("normaliza o perfil e escolhe a área correta", () => {
  assert.equal(normalizeRole("admin"), "ADMIN");
  assert.equal(roleDestination("ADMIN"), "/admin");
  assert.equal(roleDestination("COORDINATOR"), "/coordenador");
  assert.equal(roleDestination("user"), "/usuario");
  assert.equal(roleDestination("CLIENT"), "/cliente");
  assert.equal(roleDestination({ role: "USER", isHr: true }), "/rh");
  assert.equal(roleDestination({ role: "USER", isHr: false }), "/usuario");
  assert.equal(roleDestination({ role: "COORDINATOR", isHr: true }), "/rh");
  assert.equal(roleDestination({ role: "COORDINATOR", isHr: false }), "/coordenador");
});

test("direciona senha temporária para troca obrigatória", () => {
  assert.equal(roleDestination({ role: "ADMIN", mustChangePassword: true }), "/alterar-senha");
});

test("usuário fica somente em memória, sem credenciais persistidas", () => {
  saveSession({ id: 1, role: "ADMIN" });
  assert.deepEqual(getSession(), { user: { id: 1, role: "ADMIN" } });
  assert.equal(localStorage.getItem("accessmanager:token"), null);
  assert.equal(localStorage.getItem("accessmanager:user"), null);
  clearSession();
  assert.equal(getSession(), null);
});
test("armazenamento antigo não estabelece sessão", () => {
  localStorage.setItem("accessmanager:token", "token-antigo");
  localStorage.setItem("accessmanager:user", JSON.stringify({ id: 1, role: "ADMIN" }));
  assert.equal(getSession(), null);
});
test("não aceita usuário sem id ou perfil", () => {
  assert.throws(() => saveSession({ role: "USER" }), /Sessão inválida/);
  assert.throws(() => saveSession({ id: 1 }), /Sessão inválida/);
});
test("atualiza os dados somente em memória", () => {
  saveSession({ id: 1, role: "USER" });
  updateSessionUser({ id: 1, role: "ADMIN" });
  assert.deepEqual(getSession(), { user: { id: 1, role: "ADMIN" } });
});
