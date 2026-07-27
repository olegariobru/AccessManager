const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { authMiddleware, authorizeRoles, validateCredentials } = require("../middlewares/auth.middleware");

router.post("/register", validateCredentials, userController.register);
router.post("/login", validateCredentials, userController.login);
router.get("/me", authMiddleware, userController.me);
router.get("/users", authMiddleware, authorizeRoles("ADMIN"), userController.listUsers);
router.patch("/users/:id", authMiddleware, authorizeRoles("ADMIN"), userController.updateUser);
router.get("/profile", authMiddleware, userController.me);

module.exports = router;
