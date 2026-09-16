const { sequelize, PayrollRun, Payslip, Equipment } = require("../models");

// Every "days"/"months"/"limit" query param is coerced to a bounded integer
// in JS before being embedded in a raw query -- never interpolated as a raw
// string -- so there's no injection surface despite not using a bound
// parameter for the INTERVAL literal (node-postgres can't parameterize
// inside an INTERVAL expression cleanly).
function boundedInt(value, fallback, min, max) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

async function getOverview(req, res, next) {
  try {
    const [[stockValueRow], [creditRow], [paidRow], [advancesRow]] = await Promise.all([
      sequelize.query(
        `SELECT COALESCE(SUM(s.quantity_on_hand * COALESCE(latest.unit_cost, 0)), 0) AS total_value
         FROM ingredient_stocks s
         LEFT JOIN LATERAL (
           SELECT unit_cost FROM stock_movements m
           WHERE m.ingredient_id = s.ingredient_id AND m.type = 'purchase' AND m.unit_cost IS NOT NULL
           ORDER BY m.created_at DESC LIMIT 1
         ) latest ON true`,
        { type: sequelize.QueryTypes.SELECT }
      ),
      sequelize.query(
        `SELECT COALESCE(SUM(quantity_change * COALESCE(unit_cost, 0)), 0) AS total
         FROM stock_movements WHERE type = 'purchase' AND payment_status = 'credit'`,
        { type: sequelize.QueryTypes.SELECT }
      ),
      sequelize.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM supplier_payments`, {
        type: sequelize.QueryTypes.SELECT,
      }),
      sequelize.query(`SELECT COALESCE(SUM(outstanding_amount), 0) AS total FROM salary_advances`, {
        type: sequelize.QueryTypes.SELECT,
      }),
    ]);

    const now = new Date();
    const currentRun = await PayrollRun.findOne({ where: { month: now.getMonth() + 1, year: now.getFullYear() } });
    let monthlyPayrollCost = 0;
    if (currentRun) {
      const payslips = await Payslip.findAll({ where: { payrollRunId: currentRun.id } });
      monthlyPayrollCost = payslips.reduce((sum, p) => sum + Number(p.netPay), 0);
    }

    res.json({
      totalStockValue: Number(stockValueRow.total_value),
      totalSupplierDue: Number(creditRow.total) - Number(paidRow.total),
      monthlyPayrollCost,
      outstandingAdvances: Number(advancesRow.total),
    });
  } catch (err) {
    next(err);
  }
}

// Purchases carry a unit_cost (see stockController.recordMovement); wastage
// and issue movements never do, so this compares quantity, not value --
// a value comparison would silently read as zero consumption otherwise.
async function getStockMovementTrend(req, res, next) {
  try {
    const days = boundedInt(req.query.days, 30, 1, 365);
    const rows = await sequelize.query(
      `SELECT DATE(created_at) AS date,
              SUM(CASE WHEN type = 'purchase' THEN quantity_change ELSE 0 END) AS purchase_qty,
              SUM(CASE WHEN type IN ('wastage', 'issue') THEN ABS(quantity_change) ELSE 0 END) AS consumption_qty
       FROM stock_movements
       WHERE created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json(
      rows.map((r) => ({
        date: r.date,
        purchaseQty: Number(r.purchase_qty),
        consumptionQty: Number(r.consumption_qty),
      }))
    );
  } catch (err) {
    next(err);
  }
}

async function getTopIngredients(req, res, next) {
  try {
    const days = boundedInt(req.query.days, 30, 1, 365);
    const limit = boundedInt(req.query.limit, 10, 1, 50);
    const rows = await sequelize.query(
      `SELECT i.id AS ingredient_id, i.name, i.unit, SUM(ABS(m.quantity_change)) AS consumed_qty
       FROM stock_movements m
       JOIN ingredients i ON i.id = m.ingredient_id
       WHERE m.type IN ('wastage', 'issue') AND m.created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY i.id, i.name, i.unit
       ORDER BY consumed_qty DESC
       LIMIT ${limit}`,
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json(rows.map((r) => ({ ingredientId: r.ingredient_id, name: r.name, unit: r.unit, consumedQty: Number(r.consumed_qty) })));
  } catch (err) {
    next(err);
  }
}

async function getSupplierSpend(req, res, next) {
  try {
    const days = boundedInt(req.query.days, 90, 1, 365);
    const rows = await sequelize.query(
      `SELECT s.id AS supplier_id, s.name, SUM(m.quantity_change * COALESCE(m.unit_cost, 0)) AS total_spend
       FROM stock_movements m
       JOIN suppliers s ON s.id = m.supplier_id
       WHERE m.type = 'purchase' AND m.supplier_id IS NOT NULL AND m.created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY s.id, s.name
       ORDER BY total_spend DESC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json(rows.map((r) => ({ supplierId: r.supplier_id, name: r.name, totalSpend: Number(r.total_spend) })));
  } catch (err) {
    next(err);
  }
}

async function getPayrollTrend(req, res, next) {
  try {
    const months = boundedInt(req.query.months, 6, 1, 24);
    const rows = await sequelize.query(
      `SELECT pr.month, pr.year, COALESCE(SUM(p.net_pay), 0) AS total_net_pay
       FROM payroll_runs pr
       LEFT JOIN payslips p ON p.payroll_run_id = pr.id
       GROUP BY pr.id, pr.month, pr.year
       ORDER BY pr.year DESC, pr.month DESC
       LIMIT ${months}`,
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json(rows.reverse().map((r) => ({ month: r.month, year: r.year, totalNetPay: Number(r.total_net_pay) })));
  } catch (err) {
    next(err);
  }
}

async function getEquipmentSummary(req, res, next) {
  try {
    const rows = await Equipment.findAll({
      attributes: ["condition", [sequelize.fn("SUM", sequelize.col("quantity")), "total_quantity"]],
      group: ["condition"],
      raw: true,
    });
    const byCondition = { good: 0, damaged: 0, under_repair: 0, retired: 0 };
    rows.forEach((r) => {
      byCondition[r.condition] = Number(r.total_quantity);
    });
    res.json({ byCondition, totalItems: Object.values(byCondition).reduce((a, b) => a + b, 0) });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOverview,
  getStockMovementTrend,
  getTopIngredients,
  getSupplierSpend,
  getPayrollTrend,
  getEquipmentSummary,
};
