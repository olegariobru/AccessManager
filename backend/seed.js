require("dotenv").config();

const prisma = require("./src/config/prisma");
const { hashPassword } = require("./src/utils/hash");

async function main() {
  const name = process.env.TEST_USER_NAME || "Administrador AccessManager";
  const email = String(process.env.TEST_USER_EMAIL || "admin@accessmanager.local").toLowerCase();
  const password = process.env.TEST_USER_PASSWORD;

  if (!password || password.length < 12) {
    throw new Error("Defina TEST_USER_PASSWORD com ao menos 12 caracteres antes de executar o seed");
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    const [role, group, position] = await Promise.all([
      tx.role.upsert({
        where: { code: "ADMIN" },
        update: {},
        create: { code: "ADMIN", description: "Administrador global" },
      }),
      tx.group.upsert({
        where: { name: "ADMINISTRACAO" },
        update: { isActive: true },
        create: { name: "ADMINISTRACAO", slug: "administracao" },
      }),
      tx.position.upsert({
        where: { name: "Administrador" },
        update: { isActive: true },
        create: { name: "Administrador" },
      }),
    ]);

    const account = await tx.user.upsert({
      where: { email },
      update: { name, passwordHash, status: "ACTIVE", deletedAt: null },
      create: { name, email, passwordHash, status: "ACTIVE" },
    });

    await tx.userRole.upsert({
      where: { userId_roleId: { userId: account.id, roleId: role.id } },
      update: {},
      create: { userId: account.id, roleId: role.id },
    });
    const membership = await tx.userMembership.findFirst({
      where: { userId: account.id, endsAt: null, isPrimary: true },
    });
    if (!membership) {
      await tx.userMembership.create({
        data: {
          userId: account.id,
          groupId: group.id,
          positionId: position.id,
          isPrimary: true,
        },
      });
    }
    return account;
  });

  console.log("Usuário administrativo disponível:", {
    id: user.id,
    name: user.name,
    email: user.email,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
