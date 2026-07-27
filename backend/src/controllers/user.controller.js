const userService = require("../services/user.services");

async function register(req, res) {
  try {
    const {
      name,
      email,
      password,
      cargo,
      grupo
    } = req.body || {};

    const user = await userService.createUser({
      name,
      email,
      password,
      cargo,
      grupo
    });

    return res.status(201).json({
      user
    });
  } catch (error) {
    console.error("Erro ao cadastrar usuário:", error);

    const statusCode =
      error.statusCode ||
      (error.code === "23505" ? 409 : 400);

    const message =
      error.code === "23505"
        ? "E-mail já cadastrado"
        : error.message || "Erro ao cadastrar usuário";

    return res.status(statusCode).json({
      error: message
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    const result = await userService.login({
      email,
      password
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao realizar login:", error);

    return res.status(error.statusCode || 401).json({
      error: error.message || "E-mail ou senha inválidos"
    });
  }
}

async function me(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        error: "Usuário não autenticado"
      });
    }

    const user = await userService.getUserById(
      req.user.id
    );

    return res.status(200).json({
      user
    });
  } catch (error) {
    console.error("Erro ao consultar usuário:", error);

    return res.status(error.statusCode || 404).json({
      error: error.message || "Usuário não encontrado"
    });
  }
}

async function listUsers(req, res) {
  try {
    const users = await userService.listUsers();

    return res.status(200).json({
      users
    });
  } catch (error) {
    console.error("Erro ao listar usuários:", error);

    return res.status(error.statusCode || 500).json({
      error: error.message || "Erro ao listar usuários"
    });
  }
}

module.exports = {
  register,
  login,
  me,
  listUsers
};