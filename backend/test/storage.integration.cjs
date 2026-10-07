// Runs ONLY against an explicitly supplied, disposable local test database.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const db = new URL(process.env.SECURITY_TEST_DATABASE_URL || "http://invalid");
if (
  !["localhost", "127.0.0.1"].includes(db.hostname) ||
  !db.pathname.startsWith("/accessmanager_security_test")
)
  throw new Error("Use um banco local descartável accessmanager_security_test");
if (
  !/^redis:\/\/(localhost|127\.0\.0\.1):\d+/.test(
    process.env.SECURITY_TEST_REDIS_URL || "",
  )
)
  throw new Error("Use um Redis local descartável");
process.env.DATABASE_URL = process.env.SECURITY_TEST_DATABASE_URL;
process.env.REDIS_URL = process.env.SECURITY_TEST_REDIS_URL;
process.env.PRIVATE_STORAGE_DIR = require("node:fs").mkdtempSync(require("node:path").join(require("node:os").tmpdir(), "accessmanager-integration-files-"));
process.env.NODE_ENV = "production";
process.env.CORS_ORIGIN = "https://servnet.example.test";
const prisma = require("../src/config/prisma");
const sessions = require("../src/security/session");
const requests = require("../src/repositories/request.repository");
const users = require("../src/repositories/user.repository");
const audit = require("../src/repositories/security.repository");
const { limiter } = require("../src/security/limits");
const express = require("express");

test("PostgreSQL e Redis reais: concorrência, rollback, TTL e sessões compartilhadas", async (t) => {
  t.after(() => require("node:fs/promises").rm(process.env.PRIVATE_STORAGE_DIR, { recursive: true, force: true }));
  await sessions.initialize();
  await prisma.$connect();
  t.after(async () => {
    await prisma.$disconnect();
    await sessions.client().quit();
  });
  const suffix = Date.now().toString(36);
  const group = await prisma.group.create({
    data: { name: `Teste ${suffix}`, slug: `teste-${suffix}` },
  });
  const position = await prisma.position.create({
    data: { name: `Analista ${suffix}` },
  });
  await prisma.role.upsert({
    where: { code: "USER" },
    update: {},
    create: { code: "USER" },
  });
  const user = await users.createWithAccess({
    name: "Teste",
    email: `teste-${suffix}@example.test`,
    passwordHash: "fake-test-hash",
    groupId: group.id,
    positionId: position.id,
    mustChangePassword: true,
    auditEvent: { action: "USER_CREATED", entityType: "User" },
  });
  assert.equal(user.mustChangePassword, true);
  const request = await requests.createVacation({
    userId: user.id,
    startDate: new Date("2030-01-01"),
    endDate: new Date("2030-01-10"),
    days: 10,
    initialStatus: "PENDING_HR",
  });
  const decisions = await Promise.allSettled(
    ["APPROVED", "REJECTED"].map((status) =>
      requests.decideByHr({
        id: request.id,
        status,
        schedulerId: user.id,
        auditEvent: {
          actorId: user.id,
          action: "TEST_DECISION",
          entityType: "VacationRequest",
        },
      }),
    ),
  );
  assert.equal(
    decisions.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    await prisma.vacationStatusHistory.count({
      where: { requestId: request.id },
    }),
    2,
  );
  assert.equal(
    await prisma.auditLog.count({
      where: { action: "TEST_DECISION", entityId: String(request.id) },
    }),
    1,
  );
  const originalAudit = audit.audit;
  audit.audit = async () => {
    throw new Error("audit unavailable");
  };
  try {
    await assert.rejects(
      () =>
        users.changePassword(
          user.id,
          "replacement",
          { action: "PASSWORD_CHANGED" },
          0,
        ),
      /audit unavailable/,
    );
    const stored = await prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(stored.passwordHash, "fake-test-hash");
    assert.equal(stored.tokenVersion, 0);
    await assert.rejects(
      () =>
        users.createWithAccess({
          name: "Rollback",
          email: `rollback-${suffix}@example.test`,
          passwordHash: "fake",
          groupId: group.id,
          positionId: position.id,
          auditEvent: { action: "USER_CREATED" },
        }),
      /audit unavailable/,
    );
    assert.equal(
      await prisma.user.count({
        where: { email: `rollback-${suffix}@example.test` },
      }),
      0,
    );
  } finally {
    audit.audit = originalAudit;
  }
  const { PDFDocument } = require("pdf-lib");
  const pdf = await PDFDocument.create(); pdf.addPage();
  const bytes = Buffer.from(await pdf.save());
  let cpf = String(Date.now()).slice(-9);
  for (const length of [9, 10]) {
    let sum = 0;
    for (let index = 0; index < length; index += 1) sum += Number(cpf[index]) * (length + 1 - index);
    const digit = (sum * 10) % 11; cpf += digit === 10 ? "0" : String(digit);
  }
  const client = await require("../src/repositories/client.repository").createWithAccount({ fullName: "Cliente teste",
    email: `client-${suffix}@example.test`, passwordHash: "fake", cpf, phone: "11999990000", createdById: user.id });
  const actor = { id: user.id, isDocumentPublisher: true, isAccounting: true };
  const documents = require("../src/services/client-document.services");
  const payslips = require("../src/services/payslip.services");
  const document = await documents.uploadDocument(actor, { userId: client.userId, type: "ITAU_BANK_SLIP", dueDate: "2030-02-01", amount: 100 }, bytes, "boleto.pdf");
  assert.equal((await documents.downloadDocument({ id: client.userId, role: "CLIENT" }, document.id)).buffer.length, bytes.length);
  const payslip = await payslips.uploadPayslip(actor, { userId: client.userId, year: 2030, month: 1 }, bytes, "holerite.pdf");
  assert.equal((await payslips.downloadPayslip({ id: client.userId, role: "CLIENT" }, payslip.id)).buffer.length, bytes.length);
  const assetsBefore = await prisma.fileAsset.count();
  audit.audit = async () => { throw new Error("audit unavailable"); };
  try {
    await assert.rejects(() => payslips.uploadPayslip(actor, { userId: client.userId, year: 2030, month: 1 }, bytes, "replacement.pdf"), /audit unavailable/);
    assert.equal(await prisma.fileAsset.count(), assetsBefore);
    assert.equal((await require("node:fs/promises").readdir(process.env.PRIVATE_STORAGE_DIR)).length, 2);
  } finally { audit.audit = originalAudit; }
  let cookie, cookieOptions;
  await sessions.create(
    { headers: {} },
    {
      cookie: (name, value, options) => {
        cookie = `${name}=${value}`;
        cookieOptions = options;
      },
    },
    { id: user.id, tokenVersion: 0 },
  );
  assert.equal(cookieOptions.secure, true);
  assert.equal(cookieOptions.httpOnly, true);
  assert.equal(cookieOptions.sameSite, "strict");
  const loaded = await sessions.load({ headers: { cookie } });
  assert.equal(loaded.userId, user.id);
  const crypto = require("node:crypto");
  const id = cookie.split("=")[1];
  const key = `accessmanager:session:${crypto.createHash("sha256").update(id).digest("hex")}`;
  assert.ok((await sessions.client().pTTL(key)) <= 30 * 60 * 1000);
  assert.ok((await sessions.client().pTTL(key)) > 29 * 60 * 1000);
  const child = await promisify(execFile)(
    process.execPath,
    [
      "-e",
      `
    const sessions = require('./src/security/session');
    (async () => { await sessions.initialize(); const value = await sessions.load({headers:{cookie:process.env.TEST_COOKIE}});
    if (value?.userId !== Number(process.env.TEST_USER_ID)) process.exitCode=1;
    await sessions.client().quit(); })().catch(() => {process.exitCode=1;});
  `,
    ],
    {
      cwd: require("node:path").resolve(__dirname, ".."),
      env: {
        ...process.env,
        TEST_COOKIE: cookie,
        TEST_USER_ID: String(user.id),
      },
    },
  );
  assert.equal(child.stderr, "");
  await sessions.remove(id);
  assert.equal(await sessions.load({ headers: { cookie } }), null);
  // Two independent stores (as in different replicas) share the same counter.
  const servers = [0, 1].map(() => {
    const app = express();
    app.use(limiter(`test-${suffix}`, 60000, 2));
    app.get("/", (_req, res) => res.send("ok"));
    return app.listen(0, "127.0.0.1");
  });
  t.after(async () => {
    for (const server of servers) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });
  for (const server of servers)
    if (!server.listening)
      await new Promise((resolve) => server.once("listening", resolve));
  const get = (index) =>
    fetch(`http://127.0.0.1:${servers[index].address().port}/`);
  assert.equal((await get(0)).status, 200);
  assert.equal((await get(1)).status, 200);
  assert.equal((await get(0)).status, 429);
});
