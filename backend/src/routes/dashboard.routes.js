const express = require("express");
const requestController = require("../controllers/request.controller");
const { authMiddleware, authorizeRoles } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/requests", requestController.list);
router.post("/requests", authorizeRoles("USER"), requestController.create);
router.patch("/requests/:id", authorizeRoles("ADMIN", "COORDINATOR"), requestController.review);

module.exports = router;
