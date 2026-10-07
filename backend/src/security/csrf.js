const sessions = require("./session");

function trustedOrigin(req) {
  const expected = new URL(process.env.CORS_ORIGIN || "http://localhost:5173")
    .origin;
  const supplied = req.headers.origin;
  if (supplied) return supplied === expected;
  try {
    return new URL(req.headers.referer).origin === expected;
  } catch {
    return false;
  }
}

async function protectRequests(req, res, next) {
  if (req.headers.origin && !trustedOrigin(req)) {
    return res
      .status(403)
      .json({ error: "Origem não autorizada", code: "ORIGIN_DENIED" });
  }
  res.set("Cache-Control", "no-store");
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (!trustedOrigin(req))
    return res
      .status(403)
      .json({ error: "Origem não autorizada", code: "ORIGIN_DENIED" });
  try {
    const session = await sessions.load(req);
    if (
      !session ||
      !sessions.equalTokens(req.headers["x-csrf-token"], session.csrfToken)
    ) {
      return res.status(403).json({
        error: "Validação de segurança expirada. Tente novamente.",
        code: "CSRF_INVALID",
      });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { protectRequests };
