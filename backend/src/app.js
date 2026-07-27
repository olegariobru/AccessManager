const express = require ("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "20kb" }));

app.use("/auth", rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Muitas requisições. Tente novamente mais tarde." }
}));

const userRoutes = require("./routes/user.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
app.use("/auth", userRoutes);
app.use("/dashboard", dashboardRoutes);

app.get("/", (req, res) => {
    res.send("API AccessManager funcionando!");
});

module.exports = app;
