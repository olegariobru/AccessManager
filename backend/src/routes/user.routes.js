const express = require("express");
const userController = require("../controllers/user.controller");
const organizationController = require("../controllers/organization.controller");
const {
  authMiddleware,
  authorizeRoles,
  validateCredentials,
} = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/register", validateCredentials, userController.register);
router.post("/login", validateCredentials, userController.login);
router.post("/forgot-password", userController.forgotPassword);
router.get("/organization-options", organizationController.listOptions);

router.use(authMiddleware);
router.get("/me", userController.me);
router.get("/profile", userController.me);
router.post("/change-password", userController.changePassword);
router.get("/password-reset-requests", authorizeRoles("ADMIN"), userController.listPasswordResetRequests);
router.patch("/password-reset-requests", authorizeRoles("ADMIN"), userController.resetPasswordByAdmin);
router.post("/users", authorizeRoles("ADMIN"), userController.createUser);
router.get("/users", authorizeRoles("ADMIN"), userController.listUsers);
router.patch("/users/:id", authorizeRoles("ADMIN"), userController.updateUser);
router.delete("/users/:id", authorizeRoles("ADMIN"), userController.deleteUser);
router.get(
  "/coordinators/:id/groups",
  authorizeRoles("ADMIN"),
  organizationController.listCoordinatorGroups,
);
router.post(
  "/coordinators/:id/groups/:groupId",
  authorizeRoles("ADMIN"),
  organizationController.assignCoordinatorGroup,
);
router.delete(
  "/coordinators/:id/groups/:groupId",
  authorizeRoles("ADMIN"),
  organizationController.removeCoordinatorGroup,
);

module.exports = router;
