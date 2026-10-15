const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeEmail, validatePasswords } = require("../scripts/recover-sole-admin");

test("normaliza o e-mail da conta de recuperação", () => {
  assert.equal(normalizeEmail("  ADMIN@EXAMPLE.COM "), "admin@example.com");
  assert.throws(() => normalizeEmail("nao-e-email"), /E-mail inválido/);
});

test("recuperação exige senha forte e confirmação igual", () => {
  assert.doesNotThrow(() => validatePasswords("NovaSenhaForte123", "NovaSenhaForte123"));
  assert.throws(() => validatePasswords("curta", "curta"), /12 e 128/);
  assert.throws(() => validatePasswords("NovaSenhaForte123", "outra senha"), /não coincidem/);
});
