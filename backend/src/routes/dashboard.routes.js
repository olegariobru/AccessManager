const express = require("express");
const requestController = require("../controllers/request.controller");
const payslipController = require("../controllers/payslip.controller");
const {
  authMiddleware,
  authorizeRoles,
  authorizeHumanResources,
} = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/requests", requestController.list);
router.get("/requests/mine", requestController.listOwn);
router.get("/hr/requests", authorizeHumanResources, requestController.listHr);
router.post("/requests", authorizeRoles("USER", "COORDINATOR", "ADMIN"), requestController.create);
router.patch(
  "/requests/:id",
  authorizeRoles("ADMIN", "COORDINATOR"),
  requestController.review,
);
router.post("/requests/:id/cancel", authorizeRoles("USER", "COORDINATOR", "ADMIN"), requestController.cancel);
router.patch(
  "/hr/requests/:id/schedule",
  authorizeHumanResources,
  requestController.markByHr,
);
router.patch("/hr/requests/:id/decision", authorizeHumanResources, requestController.decideByHr);
router.get("/payslips", payslipController.list);
router.get("/payslips/mine", payslipController.listOwn);
router.put("/payslips", authorizeRoles("ADMIN"), payslipController.upsert);

module.exports = router;
