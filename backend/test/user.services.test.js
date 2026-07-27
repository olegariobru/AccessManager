const test = require("node:test");
const assert = require("node:assert/strict");
const userRepository = require("../src/repositories/user.repository");
const userService = require("../src/services/user.services");

test("cadastro público cria usuário no grupo padrão sem elevar privilégios", async (t) => {
  const originalCreate = userRepository.create;
  let persistedUser;

  t.after(() => {
    userRepository.create = originalCreate;
  });

  userRepository.create = async (user) => {
    persistedUser = user;
    return { id: 1, ...user };
  };

  const result = await userService.createUser({
    name: "Usuário de Teste",
    email: "TESTE@EXEMPLO.COM",
    password: "Teste@123456",
  });

  assert.equal(persistedUser.role, "USER");
  assert.equal(persistedUser.grupo, "USUARIOS");
  assert.equal(persistedUser.cargo, "Colaborador");
  assert.equal(persistedUser.email, "teste@exemplo.com");
  assert.notEqual(persistedUser.password, "Teste@123456");
  assert.equal(result.role, "USER");
});

test("cadastro rejeita campos obrigatórios ausentes", async () => {
  await assert.rejects(
    () => userService.createUser({ name: "", email: "", password: "" }),
    /obrigatórios/,
  );
});

test("GET /me retorna o perfil atual sem a senha", async (t) => {
  const originalFindById = userRepository.findById;
  t.after(() => {
    userRepository.findById = originalFindById;
  });

  userRepository.findById = async () => ({
    id: 7,
    name: "Bruno",
    email: "bruno@example.com",
    role: "user",
    cargo: "Colaborador",
    grupo: "USUARIOS",
  });

  const profile = await userService.getProfile(7);
  assert.equal(profile.role, "USER");
  assert.equal(profile.password, undefined);
});
