// Real browser + API + PostgreSQL + Redis, using ONLY disposable local fixtures.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { chromium } = require("playwright");
const db = new URL(process.env.SECURITY_TEST_DATABASE_URL || "http://invalid");
if (
  !["localhost", "127.0.0.1"].includes(db.hostname) ||
  !db.pathname.startsWith("/accessmanager_security_test")
)
  throw new Error("Use banco local descartável accessmanager_security_test");
if (
  !/^redis:\/\/(localhost|127\.0\.0\.1):\d+/.test(
    process.env.SECURITY_TEST_REDIS_URL || "",
  )
)
  throw new Error("Use Redis local descartável");
process.env.DATABASE_URL = process.env.SECURITY_TEST_DATABASE_URL;
process.env.REDIS_URL = process.env.SECURITY_TEST_REDIS_URL;
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.NODE_ENV = "test";
const prisma = require("../../backend/src/config/prisma");
const sessions = require("../../backend/src/security/session");
const users = require("../../backend/src/repositories/user.repository");
const { hashPassword } = require("../../backend/src/utils/hash");
(async () => {
  await sessions.initialize();
  await prisma.$connect();
  const app = require("../../backend/src/app");
  const server = app.listen(3000, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const browser = await chromium.launch({
    executablePath: process.env.SERVNET_CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const dir =
    process.env.SERVNET_SCREENSHOT_DIR || "/tmp/servnet-security-browser";
  await fs.mkdir(dir, { recursive: true });
  const summary = [];
  try {
    const suffix = Date.now().toString(36);
    const group = await prisma.group.create({
      data: { name: `Browser ${suffix}`, slug: `browser-${suffix}` },
    });
    const position = await prisma.position.create({
      data: { name: `Browser ${suffix}` },
    });
    await prisma.role.upsert({
      where: { code: "USER" },
      update: {},
      create: { code: "USER" },
    });
    const originalPassword = "SenhaBrowser@123";
    const passwordHash = await hashPassword(originalPassword);
    for (const width of [1440, 390]) {
      const user = await users.createWithAccess({
        name: "Funcionário de teste",
        email: `browser-${width}-${suffix}@example.test`,
        passwordHash,
        roleCodes: ["USER"],
        groupId: group.id,
        positionId: position.id,
      });
      const temporary = await users.createWithAccess({
        name: "Senha temporária",
        email: `temporary-${width}-${suffix}@example.test`,
        passwordHash,
        roleCodes: ["USER"],
        groupId: group.id,
        positionId: position.id,
        mustChangePassword: true,
      });
      const context = await browser.newContext({
        viewport: { width, height: 900 },
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const requests = [];
      page.on("request", (request) => {
        if (request.url().startsWith("http://localhost:3000"))
          requests.push(request.headers());
      });
      async function login(email, password) {
        await page.goto("http://localhost:5173/login");
        await page.getByLabel("E-mail", { exact: true }).fill(email);
        await page.getByLabel("Senha", { exact: true }).fill(password);
        await page.getByRole("button", { name: "Entrar", exact: true }).click();
      }
      await login(user.email, originalPassword);
      await page.getByRole("heading", { name: /^Olá,/ }).waitFor();
      await page.reload();
      await page.getByRole("heading", { name: /^Olá,/ }).waitFor();
      const storage = await page.evaluate(() => ({
        local: { ...localStorage },
        session: { ...sessionStorage },
        cookie: document.cookie,
      }));
      assert.deepEqual(storage.local, {});
      assert.deepEqual(storage.session, {});
      assert.ok(!storage.cookie.includes("accessmanager-session"));
      const cookie = (await context.cookies("http://localhost:3000")).find(
        (value) => value.name === "accessmanager-session",
      );
      assert.equal(cookie.httpOnly, true);
      assert.equal(cookie.sameSite, "Strict");
      const forgedLogout = await page.evaluate(
        async () =>
          (
            await fetch("http://localhost:3000/auth/logout", {
              method: "POST",
              credentials: "include",
              headers: { "X-CSRF-Token": "forjado" },
            })
          ).status,
      );
      assert.equal(forgedLogout, 403);
      const passwordWithoutCurrent = await page.evaluate(async () => {
        const { csrfToken } = await (
          await fetch("http://localhost:3000/auth/csrf", {
            credentials: "include",
          })
        ).json();
        return (
          await fetch("http://localhost:3000/auth/change-password", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrfToken,
            },
            body: JSON.stringify({ password: "NovaSenhaBrowser@123" }),
          })
        ).status;
      });
      assert.equal(passwordWithoutCurrent, 403);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: `${dir}/sessao-${width}.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Sair", exact: true }).click();
      await page.getByRole("heading", { name: "Entre na sua conta" }).waitFor();
      const replay = await fetch("http://127.0.0.1:3000/auth/me", {
        headers: { Cookie: `${cookie.name}=${cookie.value}` },
      });
      assert.equal(replay.status, 401);
      await page.goto("http://localhost:5173/usuario");
      await page.getByRole("heading", { name: "Entre na sua conta" }).waitFor();
      await login(temporary.email, originalPassword);
      await page
        .getByRole("heading", { name: "Crie uma nova senha" })
        .waitFor();
      assert.equal(
        await page.getByLabel("Senha atual", { exact: true }).count(),
        0,
      );
      const direct = await page.evaluate(
        async () =>
          (
            await fetch("http://localhost:3000/dashboard/requests", {
              credentials: "include",
            })
          ).status,
      );
      assert.equal(direct, 403);
      await page
        .getByLabel("Nova senha", { exact: true })
        .fill("NovaSenhaBrowser@123");
      await page
        .getByLabel("Confirmar nova senha", { exact: true })
        .fill("NovaSenhaBrowser@123");
      await page
        .getByRole("button", { name: "Alterar senha", exact: true })
        .click();
      await page.getByRole("heading", { name: "Entre na sua conta" }).waitFor();
      await login(temporary.email, "NovaSenhaBrowser@123");
      await page.getByRole("heading", { name: /^Olá,/ }).waitFor();
      await prisma.user.update({ where: { id: temporary.id }, data: { tokenVersion: { increment: 1 } } });
      await page.evaluate(async () => {
        const { api } = await import("/src/services/api.js");
        await api.get("/auth/me").catch(() => {});
      });
      await page.getByRole("heading", { name: "Entre na sua conta" }).waitFor();
      assert.equal(
        requests.some((headers) => headers.authorization),
        false,
      );
      assert.deepEqual(errors, []);
      summary.push({
        width,
        cookieHttpOnly: true,
        credentialsInStorage: false,
        reload: true,
        logoutRevoked: true,
        csrf: true,
        passwordChange: true,
        errors: 0,
      });
      await context.close();
    }
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
    await sessions.client().quit();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
