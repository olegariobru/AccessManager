const test = require("node:test");
const assert = require("node:assert/strict");
const clientRepository = require("../src/repositories/client.repository");
const securityRepository = require("../src/repositories/security.repository");
const userRepository = require("../src/repositories/user.repository");
const clientService = require("../src/services/client.services");

test("valida CPF com os dígitos verificadores", () => {
  assert.equal(clientService.isValidCpf("52998224725"), true);
  assert.equal(clientService.isValidCpf("52998224724"), false);
  assert.equal(clientService.isValidCpf("11111111111"), false);
});

test("normaliza os dados essenciais do cliente", () => {
  const result = clientService.normalizeCreatePayload({
    fullName: "  Maria   da Silva  ",
    email: "MARIA@EXAMPLE.COM ",
    cpf: "529.982.247-25",
    phone: "(11) 99999-0000",
    birthDate: "1990-05-20",
    password: "Temporaria@123",
  });

  assert.equal(result.fullName, "Maria da Silva");
  assert.equal(result.email, "maria@example.com");
  assert.equal(result.cpf, "52998224725");
  assert.equal(result.phone, "11999990000");
  assert.equal(result.birthDate.toISOString(), "1990-05-20T00:00:00.000Z");
});

test("cadastro cria conta CLIENT com senha em hash e sem auditar CPF", async (t) => {
  const originals = {
    findEmail: userRepository.findByEmail,
    findCpf: clientRepository.findByCpf,
    create: clientRepository.createWithAccount,
    audit: securityRepository.audit,
  };
  t.after(() => {
    userRepository.findByEmail = originals.findEmail;
    clientRepository.findByCpf = originals.findCpf;
    clientRepository.createWithAccount = originals.create;
    securityRepository.audit = originals.audit;
  });

  userRepository.findByEmail = async () => null;
  clientRepository.findByCpf = async () => null;
  let persisted;
  clientRepository.createWithAccount = async (payload) => {
    persisted = payload;
    return { id: 3, userId: 12, fullName: payload.fullName };
  };
  let audited;
  securityRepository.audit = async (payload) => { audited = payload; };

  const client = await clientService.createClient({
    fullName: "Maria da Silva",
    email: "maria@example.com",
    cpf: "529.982.247-25",
    phone: "(11) 99999-0000",
    password: "Temporaria@123",
  }, { id: 1, role: "ADMIN" });

  assert.equal(client.userId, 12);
  assert.notEqual(persisted.passwordHash, "Temporaria@123");
  assert.equal(persisted.createdById, 1);
  assert.equal(audited.action, "CLIENT_CREATED");
  assert.equal(audited.changes.cpf, undefined);
  assert.equal(audited.changes.phone, undefined);
});

test("diretório omite telefone para RH e Contabilidade", async (t) => {
  const original = clientRepository.list;
  t.after(() => { clientRepository.list = original; });
  let options;
  clientRepository.list = async (value) => { options = value; return []; };

  await clientService.listClients({ role: "USER", isDocumentPublisher: true });
  assert.deepEqual(options, { includePersonalData: false });

  await clientService.listClients({ role: "ADMIN" });
  assert.deepEqual(options, { includePersonalData: true });
});
