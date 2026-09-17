const { sequelize, SupplierPayment, Supplier, User } = require("../../models");
const { normalizePaymentMethod } = require("../../utils/paymentMethods");
const logger = require("../../utils/logger");
const notificationService = require("../../services/notificationService");

const paymentIncludes = [
  { model: Supplier, as: "supplier", attributes: ["id", "name"] },
  { model: User, as: "recordedBy", attributes: ["id", "name"] },
];

async function recordPayment(req, res, next) {
  try {
    const { supplierId, amount, paidAt, paymentMethod, note } = req.body;
    if (!supplierId || !(Number(amount) > 0)) {
      return res.status(400).json({ message: "supplierId and a positive amount are required" });
    }

    const supplier = await Supplier.findByPk(supplierId);
    if (!supplier) return res.status(400).json({ message: "Invalid supplier" });

    const payment = await SupplierPayment.create({
      supplierId,
      amount,
      paidAt: paidAt || new Date(),
      paymentMethod: normalizePaymentMethod(paymentMethod),
      note: note || null,
      createdBy: req.user.id,
    });
    logger.info("supplier_payment.recorded", { userId: req.user.id, supplierId, amount });

    const created = await SupplierPayment.findByPk(payment.id, { include: paymentIncludes });

    notificationService.emitToRoles(req.restaurant.id, ["admin"], "supplier:payment_recorded", {
      supplierId,
      supplierName: created.supplier?.name,
      amount: created.amount,
      actorUserId: req.user.id,
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

async function listPayments(req, res, next) {
  try {
    const where = {};
    if (req.query.supplierId) where.supplierId = req.query.supplierId;

    const payments = await SupplierPayment.findAll({
      where,
      include: paymentIncludes,
      order: [["paidAt", "DESC"]],
    });
    res.json(payments);
  } catch (err) {
    next(err);
  }
}

// One balance per supplier: total credit-purchased minus total paid,
// computed live from the two ledgers (stock_movements + supplier_payments)
// rather than a stored running total, so it can never drift out of sync.
async function getBalances(req, res, next) {
  try {
    const [creditTotals, paymentTotals, suppliers] = await Promise.all([
      sequelize.query(
        `SELECT supplier_id, SUM(quantity_change * COALESCE(unit_cost, 0)) AS total_credit
         FROM stock_movements
         WHERE type = 'purchase' AND payment_status = 'credit' AND supplier_id IS NOT NULL
         GROUP BY supplier_id`,
        { type: sequelize.QueryTypes.SELECT }
      ),
      sequelize.query(`SELECT supplier_id, SUM(amount) AS total_paid FROM supplier_payments GROUP BY supplier_id`, {
        type: sequelize.QueryTypes.SELECT,
      }),
      Supplier.findAll({ attributes: ["id", "name"], order: [["name", "ASC"]] }),
    ]);

    const creditBySupplier = new Map(creditTotals.map((r) => [r.supplier_id, Number(r.total_credit)]));
    const paidBySupplier = new Map(paymentTotals.map((r) => [r.supplier_id, Number(r.total_paid)]));

    const balances = suppliers.map((s) => {
      const totalCredit = creditBySupplier.get(s.id) || 0;
      const totalPaid = paidBySupplier.get(s.id) || 0;
      return {
        supplierId: s.id,
        supplierName: s.name,
        totalCredit,
        totalPaid,
        balance: totalCredit - totalPaid,
      };
    });

    res.json(balances);
  } catch (err) {
    next(err);
  }
}

module.exports = { recordPayment, listPayments, getBalances };
