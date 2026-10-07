const crypto = require("node:crypto");
const { createClient } = require("redis");

const IDLE_MS = 30 * 60 * 1000;
const ABSOLUTE_MS = 8 * 60 * 60 * 1000;
const ANONYMOUS_MS = 20 * 60 * 1000;
const memory = new Map();
let redis;
const production = () => process.env.NODE_ENV === "production";
const cookieName = () =>
  production() ? "__Host-accessmanager-session" : "accessmanager-session";
const digest = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

async function initialize() {
  const origin = process.env.CORS_ORIGIN || "http://localhost:5173";
  if (new URL(origin).origin !== origin)
    throw new Error(
      "CORS_ORIGIN deve ser uma origem sem caminho ou barra final",
    );
  if (
    production() &&
    (!process.env.REDIS_URL || new URL(origin).protocol !== "https:")
  ) {
    throw new Error("Produção exige REDIS_URL e CORS_ORIGIN com HTTPS");
  }
  if (process.env.REDIS_URL && !redis) {
    redis = createClient({
      url: process.env.REDIS_URL,
      disableOfflineQueue: true,
      socket: { connectTimeout: 5000 },
    });
    redis.on("error", () =>
      console.error("Redis indisponível; sessões não serão autorizadas"),
    );
    await redis.connect();
  }
}

async function close() {
  if (redis?.isReady) await redis.quit();
  else if (redis?.isOpen) redis.destroy();
  redis = undefined;
}

function client() {
  if ((production() || process.env.REDIS_URL) && !redis?.isReady) {
    throw new Error("Armazenamento de sessões indisponível");
  }
  return redis;
}

function readCookie(req) {
  const values = String(req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${cookieName()}=`));
  if (values.length !== 1) return null;
  const value = values[0].slice(cookieName().length + 1);
  return /^[a-f0-9]{64}$/.test(value) ? value : null;
}

function options() {
  return {
    httpOnly: true,
    secure: production(),
    sameSite: "strict",
    path: "/",
  };
}

function clearCookie(res) {
  res.clearCookie(cookieName(), options());
}

async function remove(id) {
  if (!id) return;
  const store = client();
  const key = `accessmanager:session:${digest(id)}`;
  if (store) await store.del(key);
  else memory.delete(key);
}

async function save(id, session, refresh = false) {
  const ttl = Math.min(
    session.expiresAt - Date.now(),
    session.userId ? IDLE_MS : ANONYMOUS_MS,
  );
  const store = client();
  const key = `accessmanager:session:${digest(id)}`;
  if (store)
    return Boolean(
      await store.set(key, JSON.stringify(session), {
        PX: Math.max(1, ttl),
        ...(refresh ? { XX: true } : {}),
      }),
    );
  else {
    for (const [entry, value] of memory)
      if (value.deadline <= Date.now()) memory.delete(entry);
    if (memory.size >= 5000 && !memory.has(key))
      throw new Error("Limite de sessões de desenvolvimento atingido");
    if (refresh && !memory.has(key)) return false;
    memory.set(key, { session, deadline: Date.now() + ttl });
    return true;
  }
}

async function create(req, res, user = null) {
  await remove(readCookie(req));
  const id = crypto.randomBytes(32).toString("hex");
  const session = {
    userId: user?.id || null,
    tokenVersion: user?.tokenVersion ?? null,
    csrfToken: crypto.randomBytes(32).toString("hex"),
    expiresAt: Date.now() + (user ? ABSOLUTE_MS : ANONYMOUS_MS),
  };
  await save(id, session);
  res.cookie(cookieName(), id, {
    ...options(),
    maxAge: user ? ABSOLUTE_MS : ANONYMOUS_MS,
  });
  return session;
}

async function load(req) {
  const id = readCookie(req);
  if (!id) return null;
  const store = client();
  const key = `accessmanager:session:${digest(id)}`;
  const raw = store ? await store.get(key) : memory.get(key);
  const session = store ? (raw ? JSON.parse(raw) : null) : raw?.session;
  const expired =
    !session ||
    session.expiresAt <= Date.now() ||
    (!store && raw.deadline <= Date.now());
  if (expired) {
    await remove(id);
    return null;
  }
  if (!(await save(id, session, true))) return null;
  req.sessionId = id;
  req.session = session;
  return session;
}

function equalTokens(first, second) {
  return (
    typeof first === "string" &&
    typeof second === "string" &&
    /^[a-f0-9]{64}$/.test(first) &&
    /^[a-f0-9]{64}$/.test(second) &&
    crypto.timingSafeEqual(Buffer.from(first), Buffer.from(second))
  );
}

module.exports = {
  initialize,
  close,
  client,
  create,
  load,
  remove,
  readCookie,
  clearCookie,
  cookieName,
  equalTokens,
};
