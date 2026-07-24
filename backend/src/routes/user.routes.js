const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { authMiddleware, authorizeRoles } = require("../middlewares/auth.middleware");

router.post("/register", userController.register);
router.post("/login", userController.login);
router.get("/users", authMiddleware, authorizeRoles("ADMIN"), userController.listUsers);
router.get("/profile", authMiddleware, (req, res) => {
    return res.json({
        message: "Acesso permitido",
        user: req.user
    });
});

module.exports = router;
