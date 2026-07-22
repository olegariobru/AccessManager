require("dotenv").config();

const prisma = require("./src/config/prisma.js");
const { hashPassword } = require("./src/utils/hash.js");

async function main() {
    const name = process.env.TEST_USER_NAME || "Usuário de Teste";
    const email = process.env.TEST_USER_EMAIL || "teste@accessmanager.local";
    const password = process.env.TEST_USER_PASSWORD || "Teste@123456";
    const role = process.env.TEST_USER_ROLE || "ADMIN";

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            name,
            password: hashedPassword,
            role
        },
        create: {
            name,
            email,
            password: hashedPassword,
            role
        }
    });

    console.log("Usuário de teste disponível:", {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
