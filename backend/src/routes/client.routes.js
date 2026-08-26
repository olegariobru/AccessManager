const express = require("express");
const clientController = require("../controllers/client.controller");
const {
  authMiddleware,
  authorizeClientDirectory,
  authorizeRoles,
} = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/", authorizeClientDirectory, clientController.list);
router.post("/", authorizeRoles("ADMIN"), clientController.create);

module.exports = router;
