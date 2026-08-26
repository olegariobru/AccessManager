const express = require("express");
const requestController = require("../controllers/request.controller");
const payslipController = require("../controllers/payslip.controller");
const clientDocumentController = require("../controllers/client-document.controller");
const {
  authMiddleware,
  authorizeDocumentPublisher,
  authorizeRoles,
  authorizeHumanResources,
} = require("../middlewares/auth.middleware");

const router = express.Router();
const pdfBody = express.raw({ type: "application/pdf", limit: "10mb" });

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
router.put("/payslips", authorizeDocumentPublisher, payslipController.upsert);
router.get("/admin/payslips", authorizeDocumentPublisher, payslipController.listAll);
router.post("/admin/payslips", authorizeDocumentPublisher, pdfBody, payslipController.upload);
router.get("/client/payslips/:id/download", payslipController.download);
router.get("/client/documents", clientDocumentController.listOwn);
router.get("/client/documents/:id/download", clientDocumentController.download);
router.get(
  "/admin/client-documents",
  authorizeDocumentPublisher,
  clientDocumentController.listAll,
);
router.post(
  "/admin/client-documents",
  authorizeDocumentPublisher,
  pdfBody,
  clientDocumentController.upload,
);

module.exports = router;
