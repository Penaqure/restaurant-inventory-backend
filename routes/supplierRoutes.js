const express = require("express");
const supplierController = require("../controllers/supplier/supplierController");
const supplierPaymentController = require("../controllers/supplier/supplierPaymentController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const { openTenantTransaction } = require("../middlewares/tenantScope");

const router = express.Router();

router.use(protect, openTenantTransaction);

router.get("/", supplierController.listSuppliers);
router.post("/", authorizeRoles("admin"), supplierController.createSupplier);
router.patch("/:id", authorizeRoles("admin"), supplierController.updateSupplier);
router.delete("/:id", authorizeRoles("admin"), supplierController.deleteSupplier);

// Credit balances/payments are financial data -- admin only, same as the
// payroll routes.
router.get("/balances", authorizeRoles("admin"), supplierPaymentController.getBalances);
router.get("/payments", authorizeRoles("admin"), supplierPaymentController.listPayments);
router.post("/payments", authorizeRoles("admin"), supplierPaymentController.recordPayment);

module.exports = router;
