const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const userRoutes = require("./routes/user.routes");
const dashboardRoutes = require("./routes/dashboard.routes");

const app = express();
const limiterOptions = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Muitas requisições. Tente novamente mais tarde." },
};

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "20kb" }));
app.use(rateLimit({ ...limiterOptions, windowMs: 15 * 60 * 1000, limit: 300 }));
app.use("/auth/login", rateLimit({ ...limiterOptions, windowMs: 15 * 60 * 1000, limit: 10 }));
app.use("/auth/forgot-password", rateLimit({ ...limiterOptions, windowMs: 60 * 60 * 1000, limit: 5 }));
app.use("/auth", userRoutes);
app.use("/dashboard", dashboardRoutes);
app.get("/", (_req, res) => res.send("API AccessManager funcionando!"));

module.exports = app;
