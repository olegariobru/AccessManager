const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const userRepository = require("../src/repositories/user.repository");
const {
  authMiddleware,
  authorizeClientDirectory,
  authorizeDocumentPublisher,
  authorizeRoles,
  authorizeHumanResources,
  validateCredentials,
} = require("../src/middlewares/auth.middleware");

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("aceita JWT válido e recarrega permissões relacionais do banco", async (t) => {
  const originalUser = userRepository.getAccessContext;
  const originalSecret = process.env.JWT_SECRET;
  t.after(() => {
    userRepository.getAccessContext = originalUser;
    process.env.JWT_SECRET = originalSecret;
  });
  process.env.JWT_SECRET = "segredo-de-teste";
  userRepository.getAccessContext = async () => ({
    id: 1,
    role: "ADMIN",
    roles: ["ADMIN"],
    groupIds: [],
  });
  const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = response();
  let called = false;
  await authMiddleware(req, res, () => { called = true; });
  assert.equal(called, true);
  assert.equal(req.user.role, "ADMIN");
});

test("rejeita token quando usuário está inativo", async (t) => {
  const originalUser = userRepository.getAccessContext;
  t.after(() => { userRepository.getAccessContext = originalUser; });
  userRepository.getAccessContext = async () => null;
  const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET);
  const res = response();
  await authMiddleware({ headers: { authorization: `Bearer ${token}` } }, res, () => assert.fail());
  assert.equal(res.statusCode, 401);
});

test("rejeita requisição sem token e token mal formatado", async () => {
  const missing = response();
  const malformed = response();
  await authMiddleware({ headers: {} }, missing, () => assert.fail());
  await authMiddleware(
    { headers: { authorization: "Bearer token extra" } },
    malformed,
    () => assert.fail(),
  );
  assert.equal(missing.statusCode, 401);
  assert.equal(malformed.statusCode, 401);
});

test("permite ADMIN e bloqueia USER na rota administrativa", () => {
  const adminRes = response();
  const userRes = response();
  let allowed = false;
  authorizeRoles("ADMIN")({ user: { roles: ["ADMIN"] } }, adminRes, () => { allowed = true; });
  authorizeRoles("ADMIN")({ user: { roles: ["USER"] } }, userRes, () => assert.fail());
  assert.equal(allowed, true);
  assert.equal(userRes.statusCode, 403);
});

test("permite apenas integrante do grupo RH na fila de marcação", () => {
  const rhRes = response();
  const otherGroupRes = response();
  let allowed = false;
  authorizeHumanResources(
    { user: { role: "USER", isHr: true } },
    rhRes,
    () => { allowed = true; },
  );
  authorizeHumanResources(
    { user: { role: "USER", isHr: false } },
    otherGroupRes,
    () => assert.fail(),
  );
  assert.equal(allowed, true);
  assert.equal(otherGroupRes.statusCode, 403);
});

test("publicação de documentos exige vínculo com RH ou Contabilidade", () => {
  let hrAllowed = false;
  let accountingAllowed = false;
  const denied = response();
  authorizeDocumentPublisher(
    { user: { role: "USER", isDocumentPublisher: true, isAccounting: false } },
    response(),
    () => { hrAllowed = true; },
  );
  authorizeDocumentPublisher(
    { user: { role: "USER", isDocumentPublisher: true, isAccounting: true } },
    response(),
    () => { accountingAllowed = true; },
  );
  authorizeDocumentPublisher(
    { user: { role: "ADMIN", isDocumentPublisher: false, isAccounting: false } },
    denied,
    () => assert.fail(),
  );
  assert.equal(hrAllowed, true);
  assert.equal(accountingAllowed, true);
  assert.equal(denied.statusCode, 403);
});

test("diretório de clientes permite administrador ou publicador e bloqueia cliente", () => {
  let adminAllowed = false;
  let publisherAllowed = false;
  const denied = response();
  authorizeClientDirectory(
    { user: { role: "ADMIN", isDocumentPublisher: false } },
    response(),
    () => { adminAllowed = true; },
  );
  authorizeClientDirectory(
    { user: { role: "USER", isDocumentPublisher: true } },
    response(),
    () => { publisherAllowed = true; },
  );
  authorizeClientDirectory(
    { user: { role: "CLIENT", isDocumentPublisher: false } },
    denied,
    () => assert.fail(),
  );
  assert.equal(adminAllowed, true);
  assert.equal(publisherAllowed, true);
  assert.equal(denied.statusCode, 403);
});

test("reconhece o grupo RH atual e o slug legado da migration", () => {
  assert.equal(userRepository.isHumanResourcesGroup({ name: "RH", slug: "rh" }), true);
  assert.equal(userRepository.isHumanResourcesGroup({ name: "RH", slug: "rh-a1b2c3d4" }), true);
  assert.equal(userRepository.isHumanResourcesGroup({ name: "TI", slug: "ti" }), false);
});

test("reconhece o grupo Contabilidade atual e o slug legado da migration", () => {
  assert.equal(userRepository.isAccountingGroup({ name: "CONTABILIDADE", slug: "contabilidade" }), true);
  assert.equal(userRepository.isAccountingGroup({ name: "CONTABILIDADE", slug: "contabilidade-a1b2c3d4" }), true);
  assert.equal(userRepository.isAccountingGroup({ name: "FINANCEIRO", slug: "financeiro" }), false);
});

test("normaliza credenciais e rejeita dados inválidos", () => {
  const req = { body: { email: "  TESTE@EXEMPLO.COM ", password: "Teste@123" } };
  let called = false;
  validateCredentials(req, response(), () => { called = true; });
  assert.equal(called, true);
  assert.equal(req.body.email, "teste@exemplo.com");

  const invalid = response();
  validateCredentials({ body: { email: "invalido", password: "123" } }, invalid, () => assert.fail());
  assert.equal(invalid.statusCode, 400);
});
