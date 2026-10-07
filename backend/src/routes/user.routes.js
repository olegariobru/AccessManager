const express = require("express");
const userController = require("../controllers/user.controller");
const organizationController = require("../controllers/organization.controller");
const {
  authMiddleware,
  authorizeRoles,
  validateCredentials,
} = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/csrf", userController.csrf);
router.post("/login", validateCredentials, userController.login);
router.post("/forgot-password", userController.forgotPassword);


router.use(authMiddleware);
router.post("/logout", userController.logout);
router.get("/organization-options", authorizeRoles("ADMIN"), organizationController.listOptions);
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
