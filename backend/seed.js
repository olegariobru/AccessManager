const prisma = require("./src/config/prisma.js");

async function main() {
    const user = await prisma.user.create({
        data:{
            name: "Bruno",
            email: "b.olgr13@gmail.com",
            password: "123456",
            role: "ADMIN"
        }
    });

    console.log("Usuário criado:", user);
       
}

main()
    .catch((e) => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconect();
    });