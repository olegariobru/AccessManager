const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("E-mail inválido.");
  }
  return email;
}

function validatePasswords(password, confirmation) {
  if (password.length < 12 || password.length > 128) {
    throw new Error("A senha deve ter entre 12 e 128 caracteres.");
  }
  if (password !== confirmation) throw new Error("As senhas não coincidem.");
}

async function promptHidden(label) {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("Execute este comando em um terminal interativo.");
  }

  stdout.write(label);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  let value = "";

  try {
    return await new Promise((resolve, reject) => {
      const onData = (character) => {
        if (character === "\u0003") {
          stdin.off("data", onData);
          reject(new Error("Operação cancelada."));
          return;
        }
        if (character === "\r" || character === "\n") {
          stdin.off("data", onData);
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (character === "\u0008" || character === "\u007f") {
          value = value.slice(0, -1);
          return;
        }
        if (character >= " " && character !== "\u007f" && value.length < 129) {
          value += character;
        }
      };
      stdin.on("data", onData);
    });
  } finally {
    stdin.setRawMode(false);
    stdin.pause();
  }
}

async function main() {
  require("dotenv").config();
  const prisma = require("../src/config/prisma");
  const { hashPassword } = require("../src/utils/hash");
  const securityRepository = require("../src/repositories/security.repository");
  let password = "";
  let confirmation = "";

  try {
    const databaseUrl = new URL(process.env.DATABASE_URL);
    if (!["postgresql:", "postgres:"].includes(databaseUrl.protocol)) {
      throw new Error("DATABASE_URL não aponta para PostgreSQL.");
    }
    const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ""));
    const target = `${databaseUrl.hostname}/${databaseName}`;
    const terminal = readline.createInterface({ input: stdin, output: stdout });
    const email = normalizeEmail(await terminal.question("E-mail da conta administradora: "));
    stdout.write(`Banco selecionado: ${target}\n`);
    const confirmationText = `RECUPERAR ${email} EM ${target}`;
    const typedConfirmation = await terminal.question(`Para confirmar, digite exatamente "${confirmationText}": `);
    terminal.close();
    if (typedConfirmation !== confirmationText) throw new Error("Confirmação do banco incorreta. Nenhuma alteração foi feita.");

    password = await promptHidden("Nova senha (não será exibida): ");
    confirmation = await promptHidden("Confirme a nova senha: ");
    validatePasswords(password, confirmation);

    const admins = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        roles: { some: { role: { code: "ADMIN" } } },
      },
      select: { id: true, email: true },
    });
    if (admins.length !== 1 || admins[0].email.toLowerCase() !== email) {
      throw new Error("A recuperação emergencial só pode ser usada pela única conta ADMIN ativa.");
    }

    const passwordHash = await hashPassword(password);
    await prisma.$transaction(async (tx) => {
      const currentAdmins = await tx.user.findMany({
        where: {
          status: "ACTIVE",
          deletedAt: null,
          roles: { some: { role: { code: "ADMIN" } } },
        },
        select: { id: true, email: true },
      });
      if (currentAdmins.length !== 1 || currentAdmins[0].id !== admins[0].id) {
        throw new Error("A lista de administradores mudou. Nenhuma alteração foi feita.");
      }

      await tx.user.update({
        where: { id: admins[0].id },
        data: {
          passwordHash,
          mustChangePassword: true,
          tokenVersion: { increment: 1 },
        },
      });
      await tx.passwordResetRequest.updateMany({
        where: { userId: admins[0].id, status: "PENDING" },
        data: { status: "COMPLETED", completedAt: new Date(), reviewedAt: new Date() },
      });
      await securityRepository.audit({
        actorId: null,
        action: "ADMIN_RECOVERY_BY_OPERATOR",
        description: "Recuperação emergencial do administrador executada localmente",
        entityType: "User",
        entityId: admins[0].id,
        changes: { method: "local_break_glass", sessionsInvalidated: true },
      }, tx);
    }, { isolationLevel: "Serializable" });

    stdout.write("Senha redefinida. Entre com a nova senha e crie outra quando solicitado.\n");
  } finally {
    password = "";
    confirmation = "";
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Recuperação não concluída: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { normalizeEmail, validatePasswords };
