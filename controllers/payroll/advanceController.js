const { sequelize, SalaryAdvance, Employee } = require("../../models");
const logger = require("../../utils/logger");
const notificationService = require("../../services/notificationService");

const advanceIncludes = [{ model: Employee, as: "employee", attributes: ["id", "name"] }];

async function listAdvances(req, res, next) {
  try {
    const where = {};
    if (req.query.employeeId) where.employeeId = req.query.employeeId;

    const advances = await SalaryAdvance.findAll({
      where,
      include: advanceIncludes,
      order: [["dateGiven", "DESC"]],
    });

    // Advances are a small table -- filtering "still owed" in JS rather
    // than a DB comparison isn't worth the extra query complexity.
    const filtered =
      req.query.outstanding === "true" ? advances.filter((a) => Number(a.outstandingAmount) > 0) : advances;
    res.json(filtered);
  } catch (err) {
    next(err);
  }
}

async function createAdvance(req, res, next) {
  try {
    const { employeeId, amount, dateGiven, note } = req.body;
    if (!employeeId || !(Number(amount) > 0) || !dateGiven) {
      return res.status(400).json({ message: "employeeId, a positive amount, and dateGiven are required" });
    }

    const employee = await Employee.findByPk(employeeId);
    if (!employee) return res.status(400).json({ message: "Invalid employee" });

    const advance = await SalaryAdvance.create({
      employeeId,
      amount,
      outstandingAmount: amount,
      dateGiven,
      note: note || null,
      createdBy: req.user.id,
    });
    logger.info("salary_advance.created", { userId: req.user.id, employeeId, amount });

    const created = await SalaryAdvance.findByPk(advance.id, { include: advanceIncludes });

    notificationService.emitToRoles(req.restaurant.id, ["admin"], "payroll:advance_given", {
      employeeId,
      employeeName: created.employee?.name,
      amount: created.amount,
      actorUserId: req.user.id,
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

// Manual cash repayment, outside of payroll -- caps at the current
// outstanding balance so a fat-fingered amount can't drive it negative.
async function repayAdvance(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const advance = await SalaryAdvance.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!advance) {
      await t.rollback();
      return res.status(404).json({ message: "Advance not found" });
    }

    const amount = Number(req.body.amount);
    if (!(amount > 0)) {
      await t.rollback();
      return res.status(400).json({ message: "amount must be a positive number" });
    }

    const applied = Math.min(amount, Number(advance.outstandingAmount));
    await advance.update({ outstandingAmount: Number(advance.outstandingAmount) - applied }, { transaction: t });

    await t.commit();
    logger.info("salary_advance.repaid", { userId: req.user.id, advanceId: advance.id, applied });

    const updated = await SalaryAdvance.findByPk(advance.id, { include: advanceIncludes });
    res.json(updated);
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

module.exports = { listAdvances, createAdvance, repayAdvance };
