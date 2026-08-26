const { hashPassword } = require("../utils/hash");
const clientRepository = require("../repositories/client.repository");
const securityRepository = require("../repositories/security.repository");
const userRepository = require("../repositories/user.repository");

function httpError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function isValidCpf(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

function parseBirthDate(value) {
  if (value == null || value === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    throw httpError("Data de nascimento inválida", 400, "INVALID_BIRTH_DATE");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())
    || date.toISOString().slice(0, 10) !== value
    || date > new Date()) {
    throw httpError("Data de nascimento inválida", 400, "INVALID_BIRTH_DATE");
  }
  return date;
}

function normalizeCreatePayload(payload = {}) {
  const data = {
    fullName: String(payload.fullName || "").trim().replace(/\s+/g, " "),
    email: String(payload.email || "").trim().toLowerCase(),
    password: String(payload.password || ""),
    cpf: String(payload.cpf || "").replace(/\D/g, ""),
    phone: String(payload.phone || "").replace(/\D/g, ""),
    birthDate: parseBirthDate(payload.birthDate),
  };

  if (data.fullName.length < 3 || data.fullName.length > 150) {
    throw httpError("Informe o nome completo do cliente", 400, "INVALID_FULL_NAME");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.email.length > 255) {
    throw httpError("E-mail inválido", 400, "INVALID_EMAIL");
  }
  if (!isValidCpf(data.cpf)) {
    throw httpError("CPF inválido", 400, "INVALID_CPF");
  }
  if (!/^\d{10,13}$/.test(data.phone)) {
    throw httpError("Telefone inválido; informe DDD e número", 400, "INVALID_PHONE");
  }
  if (data.password.length < 12 || data.password.length > 128) {
    throw httpError("A senha temporária deve ter entre 12 e 128 caracteres", 400, "INVALID_PASSWORD");
  }
  return data;
}

async function listClients(actor) {
  return clientRepository.list({ includePersonalData: actor?.role === "ADMIN" });
}

async function createClient(payload, actor) {
  const data = normalizeCreatePayload(payload);
  const [emailOwner, cpfOwner] = await Promise.all([
    userRepository.findByEmail(data.email),
    clientRepository.findByCpf(data.cpf),
  ]);
  if (emailOwner) throw httpError("E-mail já cadastrado", 409, "EMAIL_ALREADY_EXISTS");
  if (cpfOwner) throw httpError("CPF já cadastrado", 409, "CPF_ALREADY_EXISTS");

  let client;
  try {
    client = await clientRepository.createWithAccount({
      ...data,
      passwordHash: await hashPassword(data.password),
      createdById: actor.id,
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw httpError("E-mail ou CPF já cadastrado", 409, "CLIENT_ALREADY_EXISTS");
    }
    throw error;
  }

  await securityRepository.audit({
    actorId: actor.id,
    action: "CLIENT_CREATED",
    entityType: "ClientProfile",
    entityId: client.id,
    changes: { userId: client.userId },
  });
  return client;
}

module.exports = {
  createClient,
  isValidCpf,
  listClients,
  normalizeCreatePayload,
};
