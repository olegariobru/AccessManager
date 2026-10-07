const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const storage = require("node:fs").mkdtempSync(
  require("node:path").join(
    require("node:os").tmpdir(),
    "accessmanager-file-tests-",
  ),
);
process.env.PRIVATE_STORAGE_DIR = storage;
test.after(() => fs.rm(storage, { recursive: true, force: true }));
const { PDFDocument, PDFName, PDFString } = require("pdf-lib");
const { hashPassword, comparePassword } = require("../src/utils/hash");
const bcrypt = require("bcrypt");
const userRepository = require("../src/repositories/user.repository");
const userService = require("../src/services/user.services");
const requestService = require("../src/services/request.services");
const requestRepository = require("../src/repositories/request.repository");
const payslipService = require("../src/services/payslip.services");
const privateFiles = require("../src/services/private-file.services");
const prisma = require("../src/config/prisma");
const securityRepository = require("../src/repositories/security.repository");

test("Argon2 distingue sufixos após 72 bytes e lê hashes bcrypt legados", async () => {
  const prefix = "á".repeat(40);
  const hash = await hashPassword(prefix + "sufixo-correto");
  assert.match(hash, /^\$argon2id\$/);
  assert.equal(await comparePassword(prefix + "sufixo-correto", hash), true);
  assert.equal(await comparePassword(prefix + "sufixo-incorreto", hash), false);
  assert.equal(
    await comparePassword(
      "SenhaLegada@123",
      await bcrypt.hash("SenhaLegada@123", 10),
    ),
    true,
  );
});

test("troca de senha exige senha atual e usa versão contra concorrência", async (t) => {
  const originalFind = userRepository.findByEmail,
    originalChange = userRepository.changePassword;
  t.after(() => {
    userRepository.findByEmail = originalFind;
    userRepository.changePassword = originalChange;
  });
  const hash = await hashPassword("SenhaAtual@123");
  userRepository.findByEmail = async () => ({ passwordHash: hash });
  let persisted;
  userRepository.changePassword = async (...args) => {
    persisted = args;
  };
  const user = {
    id: 1,
    email: "teste@example.com",
    tokenVersion: 4,
    mustChangePassword: false,
  };
  for (const currentPassword of [undefined, "senha-incorreta"]) {
    await assert.rejects(
      () =>
        userService.changeOwnPassword(user, {
          password: "NovaSenhaSegura@123",
          currentPassword,
        }),
      (error) => error.code === "CURRENT_PASSWORD_REQUIRED",
    );
  }
  assert.equal(persisted, undefined);
  await userService.changeOwnPassword(user, {
    password: "NovaSenhaSegura@123",
    currentPassword: "SenhaAtual@123",
  });
  assert.equal(persisted[3], 4);
  assert.equal(persisted[2].action, "PASSWORD_CHANGED");
  await userService.changeOwnPassword(
    { ...user, mustChangePassword: true },
    { password: "NovaSenhaSegura@123" },
  );
});

test("RH e administrador não marcam nem decidem as próprias férias", async (t) => {
  const original = requestRepository.findById;
  t.after(() => {
    requestRepository.findById = original;
  });
  requestRepository.findById = async () => ({
    id: 3,
    userId: 1,
    status: "PENDING_HR",
  });
  for (const user of [
    { id: 1, role: "ADMIN" },
    { id: 1, role: "USER", isHr: true },
  ]) {
    for (const fn of [
      requestService.markRequestByHr,
      requestService.decideRequestByHr,
    ]) {
      await assert.rejects(
        () => fn(user, 3, { status: "APPROVED" }),
        (error) => error.code === "SELF_REVIEW_DENIED",
      );
    }
  }
});

test("data inexistente e metadados privados fornecidos pelo cliente são recusados", async () => {
  await assert.rejects(
    () =>
      requestService.createRequest(
        { id: 1, role: "USER" },
        { startDate: "2026-02-30", endDate: "2026-03-10" },
      ),
    (error) => error.code === "INVALID_DATE",
  );
  await assert.rejects(
    () =>
      payslipService.upsertPayslip(
        { id: 1, isDocumentPublisher: true },
        {
          userId: 2,
          year: 2026,
          month: 10,
          file: { storageKey: "arquivo-de-outro-cliente.pdf" },
        },
      ),
    (error) => error.statusCode === 400,
  );
});

test("PDF estrutural válido passa; cabeçalho falso e JavaScript são recusados", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const bytes = Buffer.from(await pdf.save());
  await privateFiles.validatePdf(bytes);
  await assert.rejects(
    () => privateFiles.validatePdf(Buffer.from("%PDF-falso\n%%EOF")),
    (error) => error.statusCode === 415,
  );
  const action = pdf.context.obj({
    S: PDFName.of("JavaScript"),
    JS: PDFString.of("app.alert('x')"),
  });
  pdf.catalog.set(PDFName.of("OpenAction"), pdf.context.register(action));
  const activeBytes = Buffer.from(await pdf.save());
  await assert.rejects(
    () => privateFiles.validatePdf(activeBytes),
    (error) => error.statusCode === 415,
  );
});

test("decisão concorrente exige status esperado e auditoria usa a mesma transação", async (t) => {
  const originalTransaction = prisma.$transaction,
    originalAudit = securityRepository.audit;
  t.after(() => {
    prisma.$transaction = originalTransaction;
    securityRepository.audit = originalAudit;
  });
  let status = "PENDING_HR",
    auditTx,
    updates = 0;
  const tx = {
    vacationRequest: {
      findUnique: async () => ({ id: 3, status: "PENDING_HR" }),
      update: async ({ where, data }) => {
        assert.equal(where.status, "PENDING_HR");
        if (status !== where.status)
          throw Object.assign(new Error("conflict"), { code: "P2025" });
        status = data.status;
        updates += 1;
        return { id: 3, status };
      },
    },
  };
  prisma.$transaction = async (operation) => operation(tx);
  securityRepository.audit = async (_event, database) => {
    auditTx = database;
  };
  const results = await Promise.allSettled(
    ["APPROVED", "REJECTED"].map((next) =>
      requestRepository.decideByHr({
        id: 3,
        status: next,
        schedulerId: 2,
        auditEvent: {
          actorId: 2,
          action: "DECISION",
          entityType: "VacationRequest",
        },
      }),
    ),
  );
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(updates, 1);
  assert.equal(auditTx, tx);
});

test("senha e auditoria falham juntas quando o registro de auditoria falha", async (t) => {
  const originalTransaction = prisma.$transaction,
    originalAudit = securityRepository.audit;
  t.after(() => {
    prisma.$transaction = originalTransaction;
    securityRepository.audit = originalAudit;
  });
  const tx = {
    user: {
      update: async ({ where }) => {
        assert.equal(where.tokenVersion, 2);
        return { id: 1 };
      },
    },
  };
  let committed = false;
  prisma.$transaction = async (operation) => {
    const result = await operation(tx);
    committed = true;
    return result;
  };
  securityRepository.audit = async (_event, database) => {
    assert.equal(database, tx);
    throw new Error("audit unavailable");
  };
  await assert.rejects(
    () =>
      userRepository.changePassword(
        1,
        "hash",
        { action: "PASSWORD_CHANGED" },
        2,
      ),
    /audit unavailable/,
  );
  assert.equal(committed, false);
});

test("download detecta arquivo adulterado e rejeita link simbólico", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const metadata = await privateFiles.storePdf(
    Buffer.from(await pdf.save()),
    "arquivo.pdf",
  );
  assert.ok(
    (await privateFiles.readPdf(metadata.storageKey, metadata.checksum)).length,
  );
  const target = require("node:path").join(storage, metadata.storageKey);
  await fs.appendFile(target, "adulteração");
  await assert.rejects(
    () => privateFiles.readPdf(metadata.storageKey, metadata.checksum),
    (error) => error.code === "FILE_INTEGRITY_FAILED",
  );
  const link = require("node:crypto").randomUUID() + ".pdf";
  await fs.symlink(target, require("node:path").join(storage, link));
  await assert.rejects(
    () => privateFiles.readPdf(link),
    (error) => error.code === "PRIVATE_FILE_NOT_FOUND",
  );
});

test("grupo RH inativo não concede publicação nem coordenação", () => {
  const user = userRepository.toPublicUser({
    id: 1,
    roles: [{ role: { code: "COORDINATOR" } }],
    memberships: [
      { group: { id: 1, name: "RH", slug: "rh", isActive: false } },
    ],
    coordinatedGroups: [
      { groupId: 1, group: { id: 1, name: "RH", slug: "rh", isActive: false } },
    ],
  });
  assert.equal(user.isHr, false);
  assert.equal(user.isDocumentPublisher, false);
  assert.deepEqual(user.groupIds, []);
});

test("conta inexistente recebe a mesma resposta de credenciais inválidas", async (t) => {
  const original = userRepository.findByEmail;
  t.after(() => {
    userRepository.findByEmail = original;
  });
  userRepository.findByEmail = async () => null;
  await assert.rejects(
    () =>
      userService.login({
        email: "inexistente@example.test",
        password: "SenhaTeste@123",
      }),
    (error) => error.statusCode === 401 && error.code === "INVALID_CREDENTIALS",
  );
});
