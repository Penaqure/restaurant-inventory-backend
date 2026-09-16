const express = require("express");
const employeeController = require("../controllers/payroll/employeeController");
const advanceController = require("../controllers/payroll/advanceController");
const payrollController = require("../controllers/payroll/payrollController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

// Salary/payroll data is sensitive -- admin only, no staff access at all
// (unlike stock/equipment, which staff can view).
router.use(protect, authorizeRoles("admin"));

router.get("/employees", employeeController.listEmployees);
router.post("/employees", employeeController.createEmployee);
router.patch("/employees/:id", employeeController.updateEmployee);
router.delete("/employees/:id", employeeController.deleteEmployee);

router.get("/advances", advanceController.listAdvances);
router.post("/advances", advanceController.createAdvance);
router.post("/advances/:id/repay", advanceController.repayAdvance);

router.get("/runs", payrollController.listRuns);
router.post("/runs", payrollController.generateRun);
router.get("/runs/:id", payrollController.getRun);
router.patch("/runs/:id/finalize", payrollController.finalizeRun);
router.patch("/payslips/:id/pay", payrollController.markPayslipPaid);

module.exports = router;
