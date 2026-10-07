require("dotenv").config();

const sessions = require("./security/session");
const prisma = require("./config/prisma");

const port = Number(process.env.PORT || 3000);

async function start() {
  await sessions.initialize();
  const app = require("./app");
  await prisma.$connect();
  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
  });
}

start().catch(async (error) => {
  console.error(JSON.stringify({ event: "STARTUP_FAILED", type: error.name, message: "Verifique a configuração e disponibilidade dos serviços" }));
  await sessions.close();
  await prisma.$disconnect();
  process.exitCode = 1;
});
