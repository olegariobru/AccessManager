require("dotenv").config();

const app = require("./app");
const prisma = require("./config/prisma");

const port = Number(process.env.PORT || 3000);

async function start() {
  await prisma.$connect();
  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
  });
}

start().catch(async (error) => {
  console.error("Falha ao iniciar o servidor", error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
