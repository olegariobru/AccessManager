const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const sessions = require("./session");

function limiter(prefix, windowMs, limit, keyGenerator) {
  const store = process.env.REDIS_URL
    ? new RedisStore({
        prefix: `accessmanager:limit:${prefix}:`,
        sendCommand: (...args) => sessions.client().sendCommand(args),
      })
    : undefined;
  return rateLimit({
    windowMs,
    limit,
    store,
    ...(keyGenerator ? { keyGenerator } : {}),
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Muitas requisições. Tente novamente mais tarde." },
  });
}
module.exports = { limiter };
