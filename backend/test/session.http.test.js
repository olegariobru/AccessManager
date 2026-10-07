const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");
const securityRepository = require("../src/repositories/security.repository");
const userRepository = require("../src/repositories/user.repository");
const { hashPassword } = require("../src/utils/hash");
const sessions = require("../src/security/session");

// Real HTTP routes, cookies and CSRF; only the database adapter is replaced.
test("HTTP: cookie, CSRF, retirada do cadastro, revogação e troca obrigatória", async (t) => {
  const hash = await hashPassword("SenhaDeTeste@123");
  let user = {
    id: 7,
    name: "Funcionário",
    email: "teste@example.com",
    passwordHash: hash,
    tokenVersion: 0,
    status: "ACTIVE",
    roles: [{ role: { code: "USER" } }],
    memberships: [],
    coordinatedGroups: [],
  };
  const originalAudit = securityRepository.audit;
  securityRepository.audit = async () => {};
  const originals = {
    find: userRepository.findByEmail,
    context: userRepository.getAccessContext,
    byId: userRepository.findById,
    create: userRepository.createWithAccess,
  };
  userRepository.findByEmail = async () => user;
  userRepository.getAccessContext = async () =>
    userRepository.toPublicUser(user);
  userRepository.findById = async () => userRepository.toPublicUser(user);
  userRepository.createWithAccess = async () =>
    assert.fail("cadastro público não pode gravar");
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    securityRepository.audit = originalAudit;
    Object.assign(userRepository, {
      findByEmail: originals.find,
      getAccessContext: originals.context,
      findById: originals.byId,
      createWithAccess: originals.create,
    });
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  let cookie, csrf;
  async function request(path, options = {}) {
    const result = await fetch(url + path, {
      ...options,
      headers: {
        Origin: "http://localhost:5173",
        ...(cookie ? { Cookie: cookie } : {}),
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        ...options.headers,
      },
    });
    const rawCookie = result.headers.get("set-cookie");
    if (rawCookie) cookie = rawCookie.split(";")[0];
    const text = await result.text();
    const body =
      text && result.headers.get("content-type")?.includes("json")
        ? JSON.parse(text)
        : text;
    if (body?.csrfToken) csrf = body.csrfToken;
    return { status: result.status, body, rawCookie, headers: result.headers };
  }
  const initial = await request("/auth/csrf");
  assert.equal(initial.status, 200);
  assert.match(initial.rawCookie, /HttpOnly/);
  assert.match(initial.rawCookie, /SameSite=Strict/);
  assert.equal(initial.headers.get("cache-control"), "no-store");
  const anonymousCookie = cookie;
  assert.equal(
    (
      await request("/auth/login", {
        method: "POST",
        headers: { "X-CSRF-Token": "invalid" },
        body: JSON.stringify({
          email: user.email,
          password: "SenhaDeTeste@123",
        }),
      })
    ).status,
    403,
  );
  const signup = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ role: "ADMIN", groupId: 1 }),
  });
  assert.ok([401, 404].includes(signup.status));
  assert.equal((await request("/auth/organization-options")).status, 401);
  const login = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: user.email, password: "SenhaDeTeste@123" }),
  });
  assert.equal(login.status, 200);
  assert.notEqual(cookie, anonymousCookie);
  assert.equal(login.body.token, undefined);
  assert.equal(login.body.user.passwordHash, undefined);
  const authenticatedCookie = cookie;
  assert.equal((await request("/auth/me")).status, 200);
  assert.equal((await request("/auth/users")).status, 403);
  assert.equal(
    (
      await request("/auth/me", {
        headers: { Origin: "https://intruso.example" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/auth/logout", {
        method: "POST",
        headers: { "X-CSRF-Token": "" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/auth/me", {
        headers: { Cookie: "", Authorization: "Bearer jwt-antigo" },
      })
    ).status,
    401,
  );
  user.mustChangePassword = true;
  const restricted = await request("/dashboard/requests");
  assert.equal(restricted.status, 403);
  assert.equal(restricted.body.code, "PASSWORD_CHANGE_REQUIRED");
  assert.equal((await request("/auth/me")).status, 200);
  assert.equal((await request("/auth/logout", { method: "POST" })).status, 204);
  assert.equal(
    (await request("/auth/me", { headers: { Cookie: authenticatedCookie } }))
      .status,
    401,
  );
  assert.equal(
    (await request("/auth/me", { headers: { Cookie: anonymousCookie } }))
      .status,
    401,
  );
  // Password/access changes invalidate every session with an earlier version.
  await request("/auth/csrf");
  await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: user.email, password: "SenhaDeTeste@123" }),
  });
  user.tokenVersion += 1;
  assert.equal((await request("/auth/me")).status, 401);
});

test("sessões expiram por inatividade e não são recriadas ao ler", async (t) => {
  const originalNow = Date.now;
  let now = originalNow();
  Date.now = () => now;
  t.after(() => {
    Date.now = originalNow;
  });
  let cookie;
  const session = await sessions.create(
    { headers: {} },
    {
      cookie: (name, value) => {
        cookie = `${name}=${value}`;
      },
    },
    { id: 1, tokenVersion: 0 },
  );
  assert.ok(session.csrfToken);
  const req = { headers: { cookie } };
  assert.ok(await sessions.load(req));
  now += 31 * 60 * 1000;
  assert.equal(await sessions.load(req), null);
  assert.equal(await sessions.load(req), null);
});

test("produção recusa armazenamento em memória e exige HTTPS", async (t) => {
  const old = process.env.NODE_ENV;
  const redis = process.env.REDIS_URL;
  process.env.NODE_ENV = "production";
  delete process.env.REDIS_URL;
  t.after(() => {
    if (old === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = old;
    if (redis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = redis;
  });
  await assert.rejects(() => sessions.initialize(), /Produção exige/);
  assert.throws(() => sessions.client(), /indisponível/);
  assert.equal(sessions.cookieName(), "__Host-accessmanager-session");
});
