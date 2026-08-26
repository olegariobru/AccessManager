const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const userRepository = require("../src/repositories/user.repository");
const securityRepository = require("../src/repositories/security.repository");
const userService = require("../src/services/user.services");
const prisma = require("../src/config/prisma");

function stubAudit(t) {
  const original = securityRepository.audit;
  securityRepository.audit = async () => {};
  t.after(() => { securityRepository.audit = original; });
}

test("cadastro administrativo persiste IDs relacionais e senha em hash", async (t) => {
  stubAudit(t);
  const originalFind = userRepository.findByEmail;
  const originalCreate = userRepository.createWithAccess;
  let persisted;
  t.after(() => {
    userRepository.findByEmail = originalFind;
    userRepository.createWithAccess = originalCreate;
  });
  userRepository.findByEmail = async () => null;
  userRepository.createWithAccess = async (payload) => {
    persisted = payload;
    return { id: 1, role: payload.roleCodes[0], group: { id: payload.groupId } };
  };

  const user = await userService.createUserByAdmin({
    name: "Bruno Olegário",
    email: "BRUNO@example.com",
    password: "Teste@123456",
    roleCode: "COORDINATOR",
    groupId: 2,
    positionId: 3,
  }, { id: 99 });

  assert.equal(persisted.email, "bruno@example.com");
  assert.equal(persisted.groupId, 2);
  assert.equal(persisted.positionId, 3);
  assert.deepEqual(persisted.roleCodes, ["COORDINATOR"]);
  assert.notEqual(persisted.passwordHash, "Teste@123456");
  assert.equal(user.role, "COORDINATOR");
});

test("cadastro público força perfil USER", async (t) => {
  const originalFind = userRepository.findByEmail;
  const originalCreate = userRepository.createWithAccess;
  let persisted;
  t.after(() => {
    userRepository.findByEmail = originalFind;
    userRepository.createWithAccess = originalCreate;
  });
  userRepository.findByEmail = async () => null;
  userRepository.createWithAccess = async (payload) => {
    persisted = payload;
    return { id: 1, role: "USER" };
  };
  await userService.createUser({
    name: "Usuário",
    email: "user@example.com",
    password: "Teste@123",
    roleCode: "ADMIN",
    groupId: 1,
    positionId: 1,
  });
  assert.deepEqual(persisted.roleCodes, ["USER"]);
});

test("cadastro rejeita e-mail existente", async (t) => {
  const original = userRepository.findByEmail;
  t.after(() => { userRepository.findByEmail = original; });
  userRepository.findByEmail = async () => ({ id: 1 });
  await assert.rejects(
    () => userService.createUserByAdmin({
      name: "Bruno",
      email: "bruno@example.com",
      password: "Teste@123456",
      roleCode: "USER",
      groupId: 1,
      positionId: 1,
    }, { id: 2 }),
    (error) => error.statusCode === 409,
  );
});

test("login retorna JWT e usuário relacional sem senha", async (t) => {
  const originalFind = userRepository.findByEmail;
  const originalSecret = process.env.JWT_SECRET;
  t.after(() => {
    userRepository.findByEmail = originalFind;
    process.env.JWT_SECRET = originalSecret;
  });
  process.env.JWT_SECRET = "segredo-de-teste";
  const { hashPassword } = require("../src/utils/hash");
  userRepository.findByEmail = async () => ({
    id: 7,
    name: "Bruno",
    email: "bruno@example.com",
    passwordHash: await hashPassword("Teste@123"),
    status: "ACTIVE",
    deletedAt: null,
    roles: [{ role: { code: "USER" } }],
    memberships: [{ group: { id: 1, name: "TI" }, position: { id: 2, name: "Analista" } }],
    coordinatedGroups: [],
  });
  const result = await userService.login({ email: "bruno@example.com", password: "Teste@123" });
  assert.equal(jwt.verify(result.token, process.env.JWT_SECRET).id, 7);
  assert.equal(result.user.role, "USER");
  assert.equal(result.user.passwordHash, undefined);
  assert.equal(result.user.grupo, "TI");
});

test("coordenador do grupo RH recebe acesso à fila global do RH", () => {
  const user = userRepository.toPublicUser({
    id: 8,
    name: "Coordenador RH",
    email: "coordenador.rh@example.com",
    roles: [{ role: { code: "COORDINATOR" } }],
    memberships: [{
      group: { id: 2, name: "ADMINISTRATIVO", slug: "administrativo" },
      position: { id: 3, name: "Coordenador" },
    }],
    coordinatedGroups: [{
      groupId: 7,
      group: { id: 7, name: "RH", slug: "rh" },
    }],
  });

  assert.equal(user.role, "COORDINATOR");
  assert.equal(user.isHr, true);
  assert.equal(user.isHrMember, false);
  assert.equal(user.isDocumentPublisher, false);
  assert.deepEqual(user.groupIds, [7]);
});

test("vínculo ativo com Contabilidade habilita publicação de documentos", () => {
  const user = userRepository.toPublicUser({
    id: 9,
    name: "Profissional Contábil",
    email: "contabil@example.com",
    roles: [{ role: { code: "USER" } }],
    memberships: [{
      group: { id: 4, name: "CONTABILIDADE", slug: "contabilidade" },
      position: { id: 2, name: "Contador" },
    }],
    coordinatedGroups: [],
  });

  assert.equal(user.isAccounting, true);
  assert.equal(user.isHr, false);
  assert.equal(user.isDocumentPublisher, true);
});

test("conta de cliente recebe perfil próprio e não ganha permissão de publicação", () => {
  const user = userRepository.toPublicUser({
    id: 18,
    name: "Cliente Exemplo",
    email: "cliente@example.com",
    roles: [{ role: { code: "CLIENT" } }],
    memberships: [],
    coordinatedGroups: [],
  });

  assert.equal(user.role, "CLIENT");
  assert.equal(user.isDocumentPublisher, false);
  assert.equal(user.isHr, false);
  assert.equal(user.isAccounting, false);
});

test("administrador master recebe acesso a todos os grupos ativos", async () => {
  const groups = [
    { id: 2, name: "Financeiro", slug: "financeiro" },
    { id: 1, name: "TI", slug: "ti" },
  ];
  const administrator = await userRepository.withMasterGroupScope({
    id: 1,
    role: "ADMIN",
    roles: ["ADMIN"],
    groupIds: [],
    accessibleGroups: [],
  }, {
    group: {
      findMany: async (query) => {
        assert.deepEqual(query.where, { isActive: true });
        return groups;
      },
    },
  });

  assert.equal(administrator.isMaster, true);
  assert.deepEqual(administrator.groupIds, [2, 1]);
  assert.deepEqual(administrator.accessibleGroups, groups);
});

test("inativação impede auto-inativação", async () => {
  await assert.rejects(
    () => userService.deleteUser(7, { id: 7 }),
    (error) => error.statusCode === 403,
  );
});

test("pesquisa de usuários normaliza o termo antes de consultar", async (t) => {
  const original = userRepository.findAll;
  let receivedSearch;
  t.after(() => { userRepository.findAll = original; });
  userRepository.findAll = async (search) => {
    receivedSearch = search;
    return [{ id: 1, name: "Bruno" }];
  };

  const users = await userService.listUsers("  BRUNO@example.com  ");

  assert.equal(receivedSearch, "BRUNO@example.com");
  assert.equal(users.length, 1);
});

test("pesquisa de usuários rejeita termos acima do limite", async () => {
  await assert.rejects(
    () => userService.listUsers("a".repeat(101)),
    (error) => error.statusCode === 400 && error.code === "INVALID_SEARCH",
  );
});

test("repositório pesquisa usuários ativos por nome ou e-mail sem diferenciar maiúsculas", async (t) => {
  const original = prisma.user.findMany;
  let query;
  t.after(() => { prisma.user.findMany = original; });
  prisma.user.findMany = async (options) => {
    query = options;
    return [];
  };

  await userRepository.findAll("bruno");

  assert.equal(query.where.deletedAt, null);
  assert.equal(query.where.status, "ACTIVE");
  assert.deepEqual(query.where.roles, { none: { role: { code: "CLIENT" } } });
  assert.deepEqual(query.where.OR, [
    { name: { contains: "bruno", mode: "insensitive" } },
    { email: { contains: "bruno", mode: "insensitive" } },
  ]);
});
