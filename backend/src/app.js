const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const crypto = require("node:crypto");
const { limiter } = require("./security/limits");
const { protectRequests } = require("./security/csrf");
const { sendError } = require("./security/errors");
const userRoutes = require("./routes/user.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const clientRoutes = require("./routes/client.routes");

const app = express();
app.disable("x-powered-by");
// Explicit proxy IPs/CIDRs only; never trust arbitrary forwarding headers.
if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY.split(",").map((value) => value.trim()));
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "X-CSRF-Token"],
  credentials: true,
}));
app.use(express.json({ limit: "20kb" }));
app.use(protectRequests);
app.use(limiter("global", 15 * 60 * 1000, 300));
app.use("/auth/login", limiter("login-ip", 15 * 60 * 1000, 10));
app.use("/auth/login", limiter("login-account", 15 * 60 * 1000, 20, (req) =>
  crypto.createHash("sha256").update(String(req.body?.email || "").trim().toLowerCase()).digest("hex")));
app.use("/auth/forgot-password", limiter("recovery", 60 * 60 * 1000, 5));
app.use("/auth", userRoutes);
app.use("/clients", clientRoutes);
app.use("/dashboard", dashboardRoutes);
app.get("/", (_req, res) => res.send("API AccessManager funcionando!"));
app.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "O arquivo PDF deve ter no máximo 10 MB" });
  }
  if (error.type === "entity.parse.failed") return res.status(400).json({ error: "JSON inválido" });
  return sendError(res, error);
});

module.exports = app;
