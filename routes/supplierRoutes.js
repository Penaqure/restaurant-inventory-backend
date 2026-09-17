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

// Registered after the literal /balances and /payments routes above --
// otherwise this would swallow them (Express matches :id against any single
// path segment, including "balances"/"payments").
router.get("/:id", authorizeRoles("admin"), supplierController.getSupplier);
router.get("/:id/items", authorizeRoles("admin"), supplierController.getSupplierItems);
router.get("/:id/spend-trend", authorizeRoles("admin"), supplierController.getSupplierSpendTrend);

module.exports = router;
