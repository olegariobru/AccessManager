const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { authMiddleware, authorizeRoles, validateCredentials } = require("../src/middlewares/auth.middleware");

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("aceita token válido e disponibiliza o usuário", () => {
  process.env.JWT_SECRET = "segredo-de-teste";
  const token = jwt.sign({ id: 1, role: "ADMIN" }, process.env.JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createResponse();
  let called = false;

  authMiddleware(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(req.user.role, "ADMIN");
});

test("rejeita requisição sem token", () => {
  const req = { headers: {} };
  const res = createResponse();

  authMiddleware(req, res, () => assert.fail("next não deve ser chamado"));

  assert.equal(res.statusCode, 401);
});

test("permite ADMIN e bloqueia USER na rota administrativa", () => {
  const adminReq = { user: { role: "ADMIN" } };
  const userReq = { user: { role: "USER" } };
  const adminRes = createResponse();
  const userRes = createResponse();
  let adminAllowed = false;

  authorizeRoles("ADMIN")(adminReq, adminRes, () => {
    adminAllowed = true;
  });
  authorizeRoles("ADMIN")(userReq, userRes, () => assert.fail("USER não deve ser autorizado"));

  assert.equal(adminAllowed, true);
  assert.equal(userRes.statusCode, 403);
});

test("normaliza e valida credenciais antes da autenticação", () => {
  const req = { body: { email: "  TESTE@EXEMPLO.COM ", password: "Teste@123" } };
  const res = createResponse();
  let called = false;

  validateCredentials(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(req.body.email, "teste@exemplo.com");
});

test("rejeita e-mail inválido e senha curta", () => {
  const res = createResponse();
  validateCredentials(
    { body: { email: "invalido", password: "123" } },
    res,
    () => assert.fail("next não deve ser chamado"),
  );
  assert.equal(res.statusCode, 400);
});
