const express = require("express");
const analyticsController = require("../controllers/analyticsController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const { openTenantTransaction } = require("../middlewares/tenantScope");

const router = express.Router();

// All analytics figures are financial (stock value, spend, payroll, dues) --
// admin only, same as payrollRoutes.js.
router.use(protect, openTenantTransaction, authorizeRoles("admin"));

router.get("/overview", analyticsController.getOverview);
router.get("/stock-movement-trend", analyticsController.getStockMovementTrend);
router.get("/top-ingredients", analyticsController.getTopIngredients);
router.get("/supplier-spend", analyticsController.getSupplierSpend);
router.get("/payroll-trend", analyticsController.getPayrollTrend);
router.get("/equipment-summary", analyticsController.getEquipmentSummary);

module.exports = router;
