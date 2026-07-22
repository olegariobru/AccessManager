const { hashPassword } = require("../utils/hash");
const userRepository = require("../repositories/user.repository");
const { comparePassword } = require("../utils/hash");
const jwt = require("jsonwebtoken");

async function createUser({ name, email, password }) {
  const hashedPassword = await hashPassword(password);

  return await userRepository.create({
    name,
    email,
    password: hashedPassword
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
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return{
    id: user.id,
    name: user.name,
    email: user.email
  },token
};

module.exports = {
  createUser,
  login
};