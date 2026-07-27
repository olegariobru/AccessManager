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
});

test("normaliza o perfil e escolhe a área correta", () => {
  assert.equal(normalizeRole("admin"), "ADMIN");
  assert.equal(roleDestination("ADMIN"), "/admin");
  assert.equal(roleDestination("user"), "/usuario");
});

test("salva, recupera e encerra a sessão", () => {
  saveSession("token-valido", { id: 1, role: "ADMIN" });
  assert.deepEqual(getSession(), {
    token: "token-valido",
    user: { id: 1, role: "ADMIN" },
  });

  clearSession();
  assert.equal(getSession(), null);
});

test("descarta uma sessão com usuário inválido", () => {
  localStorage.setItem("accessmanager:token", "token-valido");
  localStorage.setItem("accessmanager:user", "{json-invalido");
  assert.equal(getSession(), null);
});

test("atualiza os dados do usuário sem perder o token", () => {
  saveSession("token-valido", { id: 1, role: "USER" });
  updateSessionUser({ id: 1, role: "ADMIN" });
  assert.deepEqual(getSession(), {
    token: "token-valido",
    user: { id: 1, role: "ADMIN" },
  });
});
