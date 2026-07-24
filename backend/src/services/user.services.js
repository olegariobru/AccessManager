const { hashPassword, comparePassword } = require("../utils/hash");
const userRepository = require("../repositories/user.repository");
const jwt = require("jsonwebtoken");

async function createUser({ name, email, password, cargo, grupo }) {
  if (!name?.trim() || !email?.trim() || !password) {
    throw new Error("Nome, e-mail e senha são obrigatórios");
  }

  const hashedPassword = await hashPassword(password);

  return await userRepository.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hashedPassword,
    role: "USER",
    cargo: cargo || "Colaborador",
    grupo: grupo || "USUARIOS"
  });
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new Error("Usuário não encontrado");
  }

  const isValid = await comparePassword(password, user.password);

  if (!isValid) {
    throw new Error("Senha incorreta");
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: String(user.role || "USER").toUpperCase(),
      cargo: user.cargo,
      grupo: user.grupo
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: String(user.role || "USER").toUpperCase(),
      cargo: user.cargo,
      grupo: user.grupo
    }
  };
}

async function listUsers() {
  return userRepository.findAll();
}

module.exports = {
  createUser,
  login,
  listUsers
};
