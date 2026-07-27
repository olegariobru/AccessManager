const {
  hashPassword,
  comparePassword
} = require("../utils/hash");

const userRepository = require("../repositories/user.repository");
const jwt = require("jsonwebtoken");

async function createUser({
  name,
  email,
  password,
  cargo,
  grupo
}) {
  if (!name?.trim() || !email?.trim() || !password) {
    const error = new Error(
      "Nome, e-mail e senha são obrigatórios"
    );

    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email
    .trim()
    .toLowerCase();

  const existingUser =
    await userRepository.findByEmail(normalizedEmail);

  if (existingUser) {
    const error = new Error("E-mail já cadastrado");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword =
    await hashPassword(password);

  return userRepository.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role: "USER",
    cargo: cargo || "Colaborador",
    grupo: grupo || "USUARIOS"
  });
}

async function login({ email, password }) {
  if (!process.env.JWT_SECRET) {
    const error = new Error(
      "JWT_SECRET não configurado"
    );

    error.statusCode = 500;
    throw error;
  }

  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  const user =
    await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    const error = new Error(
      "E-mail ou senha inválidos"
    );

    error.statusCode = 401;
    throw error;
  }

  const isValid = await comparePassword(
    password,
    user.password
  );

  if (!isValid) {
    const error = new Error(
      "E-mail ou senha inválidos"
    );

    error.statusCode = 401;
    throw error;
  }

  const role = String(user.role || "USER")
    .trim()
    .toUpperCase();

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
      cargo: user.cargo,
      grupo: user.grupo
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d"
    }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role,
      cargo: user.cargo,
      grupo: user.grupo
    }
  };
}

async function getUserById(id) {
  const user = await userRepository.findById(id);

  if (!user) {
    const error = new Error(
      "Usuário não encontrado"
    );

    error.statusCode = 404;
    throw error;
  }

  return {
    ...user,
    role: String(user.role || "USER")
      .trim()
      .toUpperCase()
  };
}

async function listUsers() {
  return userRepository.findAll();
}

module.exports = {
  createUser,
  login,
  getUserById,
  listUsers
};