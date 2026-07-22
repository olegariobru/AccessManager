const prisma = require("./src/config/prisma");

async function test() {
  try {
    const users = await prisma.user.findMany();
    console.log("Conectou no banco:", users);
  } catch (error) {
    console.error("Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

test();