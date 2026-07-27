const test = require("node:test");
const assert = require("node:assert/strict");
const userRepository = require("../src/repositories/user.repository");
const userService = require("../src/services/user.services");

test("cadastro público cria usuário no grupo padrão sem elevar privilégios", async (t) => {
  const originalCreate = userRepository.create;
  const originalFindByEmail = userRepository.findByEmail;
  let persistedUser;

  t.after(() => {
    userRepository.create = originalCreate;
    userRepository.findByEmail = originalFindByEmail;
  });

  userRepository.findByEmail = async () => null;
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

  const profile = await userService.getUserById(7);
  assert.equal(profile.role, "USER");
  assert.equal(profile.password, undefined);
});

test("cadastro rejeita e-mail já existente antes do INSERT", async (t) => {
  const originalFindByEmail = userRepository.findByEmail;
  const originalCreate = userRepository.create;
  let createCalled = false;

  t.after(() => {
    userRepository.findByEmail = originalFindByEmail;
    userRepository.create = originalCreate;
  });

  userRepository.findByEmail = async () => ({ id: 1 });
  userRepository.create = async () => {
    createCalled = true;
  };

  await assert.rejects(
    () => userService.createUser({
      name: "Bruno",
      email: "bruno@example.com",
      password: "Teste@123456",
    }),
    (error) => error.statusCode === 409 && /cadastrado/.test(error.message),
  );
  assert.equal(createCalled, false);
});

test("login não revela se falhou por e-mail ou senha", async (t) => {
  const originalFindByEmail = userRepository.findByEmail;
  const originalSecret = process.env.JWT_SECRET;

  t.after(() => {
    userRepository.findByEmail = originalFindByEmail;
    process.env.JWT_SECRET = originalSecret;
  });

  process.env.JWT_SECRET = "segredo-de-teste";
  userRepository.findByEmail = async () => null;

  await assert.rejects(
    () => userService.login({ email: "naoexiste@example.com", password: "Teste@123" }),
    (error) => error.statusCode === 401 && error.message === "E-mail ou senha inválidos",
  );
});
