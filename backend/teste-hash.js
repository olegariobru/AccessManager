const { hashPassword, comparePassword } = require("./src/utils/hash");

async function test() {
  const password = "123456";

  const hashed = await hashPassword(password);
  console.log("Senha criptografada:", hashed);

  const isValid = await comparePassword(password, hashed);
  console.log("Senha válida?", isValid);
}

test();