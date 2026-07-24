const express = require ("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const userRoutes = require("./routes/user.routes");
app.use("/auth", userRoutes);

app.get("/", (req, res) => {
    res.send("API AccessManager funcionando!");
});

module.exports = app;
