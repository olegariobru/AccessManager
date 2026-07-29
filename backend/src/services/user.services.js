const { hashPassword, comparePassword } = require("../utils/hash");
const userRepository = require("../repositories/user.repository");
const jwt = require("jsonwebtoken");

async function createUser({
  name,
  email,
  password,
  cargo,
  grupo,
}) {
  if (!name?.trim() || !email?.trim() || !password) {
    const error = new Error(
      "Nome, e-mail e senha são obrigatórios",
    );
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser =
    await userRepository.findByEmail(normalizedEmail);

  if (existingUser) {
    const error = new Error("E-mail já cadastrado");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await hashPassword(password);

  return userRepository.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role: "USER",
    cargo: cargo?.trim() || "Colaborador",
    grupo: grupo?.trim().toUpperCase() || "USUARIOS",
  });
}

async function createUserByAdmin(payload = {}) {
  const name = String(payload.name || "").trim();

  const email = String(payload.email || "")
    .trim()
    .toLowerCase();

  const password = String(payload.password || "");

  const role = String(payload.role || "")
    .trim()
    .toUpperCase();

  const cargo = String(payload.cargo || "")
    .trim()
    .slice(0, 100);

  const grupo = String(payload.grupo || "")
    .trim()
    .toUpperCase()
    .slice(0, 100);

  if (
    !name ||
    !email ||
    !password ||
    !role ||
    !cargo ||
    !grupo
  ) {
    const error = new Error(
      "Nome, e-mail, senha, perfil, cargo e grupo são obrigatórios",
    );
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 8 || password.length > 128) {
    const error = new Error(
      "A senha deve ter entre 8 e 128 caracteres",
    );
    error.statusCode = 400;
    throw error;
  }

  const allowedRoles = [
    "USER",
    "COORDINATOR",
    "ADMIN",
  ];

  if (!allowedRoles.includes(role)) {
    const error = new Error("Perfil inválido");
    error.statusCode = 400;
    throw error;
  }

  const existingUser =
    await userRepository.findByEmail(email);

  if (existingUser) {
    const error = new Error("E-mail já cadastrado");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await hashPassword(password);

  return userRepository.create({
    name,
    email,
    password: hashedPassword,
    role,
    cargo,
    grupo,
  });
}

async function login({ email, password }) {
  if (!email?.trim() || !password) {
    const error = new Error("E-mail e senha são obrigatórios");
    error.statusCode = 400;
    throw error;
  }

  if (!process.env.JWT_SECRET) {
    const error = new Error("Erro na configuração do servidor");
    error.statusCode = 500;
    throw error;
  }

  const user = await userRepository.findByEmail(email.trim().toLowerCase());

  if (!user) {
    const error = new Error("E-mail ou senha inválidos");
    error.statusCode = 401;
    throw error;
  }

  const isValid = await comparePassword(password, user.password);

  if (!isValid) {
    const error = new Error("E-mail ou senha inválidos");
    error.statusCode = 401;
    throw error;
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

async function getUserById(userId) {
  const user = await userRepository.findById(userId);

  if (!user) {
    const error = new Error("Usuário não encontrado");
    error.statusCode = 404;
    throw error;
  }

  return {
    ...user,
    role: String(user.role || "USER").toUpperCase()
  };
}

async function listUsers() {
  return userRepository.findAll();
}

async function updateUser(userId, payload = {}) {
  const currentUser = await userRepository.findById(userId);
  if (!currentUser) {
    const error = new Error("Usuário não encontrado");
    error.statusCode = 404;
    throw error;
  }

  const role = String(payload.role || currentUser.role).trim().toUpperCase();
  if (!["USER", "COORDINATOR", "ADMIN"].includes(role)) {
    const error = new Error("Perfil inválido");
    error.statusCode = 400;
    throw error;
  }

  const cargo = String(payload.cargo || currentUser.cargo || "Colaborador").trim().slice(0, 100);
  const grupo = String(payload.grupo || currentUser.grupo || "USUARIOS").trim().toUpperCase().slice(0, 100);

  if (!cargo || !grupo) {
    const error = new Error("Cargo e grupo são obrigatórios");
    error.statusCode = 400;
    throw error;
  }

  return userRepository.update(userId, { role, cargo, grupo });
}

  async function deleteUser(userId, authenticatedUser) {
    if (String(userId) === String(authenticatedUser.id)) {
      const error = new Error(
        "Não é permitido excluir o próprio usuário");
      error.statusCode = 403;
      throw error;
    }

    const user = await userRepository.findById(userId);
    if (!user){
      const error = new Error("Usuário não encontrado");
      error.statusCode = 404;
      throw error;
    }

    try {
      return await userRepository.remove(userId);
    }catch (error){
      if (error.code === "23503") {
        const conflictError = new Error(
          "O usuário não possui registros relacionados e nao pode ser excluido");
        conflictError.statusCode = 409;
        throw conflictError;
       }

       throw error;
        
    }
  }

module.exports = {
  createUser,
  createUserByAdmin,
  login,
  getUserById,
  listUsers,
  updateUser,
  deleteUser
};
