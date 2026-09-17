const { sequelize, PayrollRun, Payslip, Employee, SalaryAdvance, User } = require("../../models");
const { PAYMENT_METHODS } = require("../../utils/paymentMethods");
const logger = require("../../utils/logger");
const notificationService = require("../../services/notificationService");

const runIncludes = [{ model: User, as: "generator", attributes: ["id", "name"] }];
const payslipIncludes = [{ model: Employee, as: "employee", attributes: ["id", "name", "designation"] }];

async function listRuns(req, res, next) {
  try {
    const runs = await PayrollRun.findAll({
      include: runIncludes,
      order: [
        ["year", "DESC"],
        ["month", "DESC"],
      ],
    });
    res.json(runs);
  } catch (err) {
    next(err);
  }
}

async function getRun(req, res, next) {
  try {
    const run = await PayrollRun.findByPk(req.params.id, { include: runIncludes });
    if (!run) return res.status(404).json({ message: "Payroll run not found" });

    const payslips = await Payslip.findAll({
      where: { payrollRunId: run.id },
      include: payslipIncludes,
      order: [[{ model: Employee, as: "employee" }, "name", "ASC"]],
    });
    res.json({ ...run.toJSON(), payslips });
  } catch (err) {
    next(err);
  }
}

// For every active employee: snapshot their current salary, settle as much
// of their outstanding advances as this month's salary allows (oldest
// advance first), and create a payslip. Never lets net pay go negative --
// if outstanding advances exceed the salary, the remainder just carries
// over to next month's run.
async function generateRun(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const month = Number(req.body.month);
    const year = Number(req.body.year);
    if (!month || month < 1 || month > 12 || !year) {
      await t.rollback();
      return res.status(400).json({ message: "A valid month (1-12) and year are required" });
    }

    const existing = await PayrollRun.findOne({ where: { month, year }, transaction: t });
    if (existing) {
      await t.rollback();
      return res.status(409).json({ message: `A payroll run for ${month}/${year} already exists` });
    }

    const run = await PayrollRun.create({ month, year, generatedBy: req.user.id }, { transaction: t });

    const employees = await Employee.findAll({ where: { status: "active" }, transaction: t });
    for (const employee of employees) {
      const baseSalary = Number(employee.monthlySalary);

      const advances = await SalaryAdvance.findAll({
        where: { employeeId: employee.id },
        order: [["dateGiven", "ASC"]],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const outstandingAdvances = advances.filter((a) => Number(a.outstandingAmount) > 0);

      let remainingToDeduct = baseSalary;
      let advanceDeduction = 0;
      for (const advance of outstandingAdvances) {
        if (remainingToDeduct <= 0) break;
        const applied = Math.min(Number(advance.outstandingAmount), remainingToDeduct);
        await advance.update({ outstandingAmount: Number(advance.outstandingAmount) - applied }, { transaction: t });
        advanceDeduction += applied;
        remainingToDeduct -= applied;
      }

      await Payslip.create(
        {
          payrollRunId: run.id,
          employeeId: employee.id,
          baseSalary,
          advanceDeduction,
          netPay: baseSalary - advanceDeduction,
        },
        { transaction: t }
      );
    }

    await t.commit();
    logger.info("payroll_run.generated", { userId: req.user.id, runId: run.id, month, year, employeeCount: employees.length });

    const created = await PayrollRun.findByPk(run.id, { include: runIncludes });
    const payslips = await Payslip.findAll({ where: { payrollRunId: run.id }, include: payslipIncludes });

    notificationService.emitToRoles(req.restaurant.id, ["admin"], "payroll:run_generated", {
      runId: run.id,
      month,
      year,
      employeeCount: employees.length,
      totalNetPay: payslips.reduce((sum, p) => sum + Number(p.netPay), 0),
      actorUserId: req.user.id,
    });

    res.status(201).json({ ...created.toJSON(), payslips });
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

async function finalizeRun(req, res, next) {
  try {
    const run = await PayrollRun.findByPk(req.params.id);
    if (!run) return res.status(404).json({ message: "Payroll run not found" });
    if (run.status === "finalized") return res.status(409).json({ message: "This run is already finalized" });

    await run.update({ status: "finalized", finalizedAt: new Date() });
    logger.info("payroll_run.finalized", { userId: req.user.id, runId: run.id });
    res.json(run);
  } catch (err) {
    next(err);
  }
}

async function markPayslipPaid(req, res, next) {
  try {
    const { paymentMethod } = req.body;
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ message: `paymentMethod must be one of ${PAYMENT_METHODS.join(", ")}` });
    }

    const payslip = await Payslip.findByPk(req.params.id, { include: payslipIncludes });
    if (!payslip) return res.status(404).json({ message: "Payslip not found" });
    if (payslip.status === "paid") return res.status(409).json({ message: "This payslip is already marked paid" });

    await payslip.update({ status: "paid", paidAt: new Date(), paymentMethod });
    logger.info("payslip.paid", { userId: req.user.id, payslipId: payslip.id, employeeId: payslip.employeeId });
    res.json(payslip);
  } catch (err) {
    next(err);
  }
}

module.exports = { listRuns, getRun, generateRun, finalizeRun, markPayslipPaid };
