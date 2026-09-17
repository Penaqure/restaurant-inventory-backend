const { sequelize, Supplier, StockMovement } = require("../../models");
const { boundedInt } = require("../../utils/boundedInt");
const logger = require("../../utils/logger");

async function listSuppliers(req, res, next) {
  try {
    const suppliers = await Supplier.findAll({ order: [["name", "ASC"]] });
    res.json(suppliers);
  } catch (err) {
    next(err);
  }
}

async function getSupplier(req, res, next) {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    res.json(supplier);
  } catch (err) {
    next(err);
  }
}

async function createSupplier(req, res, next) {
  try {
    const { name, contactPhone, contactEmail, notes } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const supplier = await Supplier.create({
      name,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
      notes: notes || null,
    });
    logger.info("supplier.created", { userId: req.user.id, supplierId: supplier.id, name });
    res.status(201).json(supplier);
  } catch (err) {
    next(err);
  }
}

async function updateSupplier(req, res, next) {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });

    const { name, contactPhone, contactEmail, notes, isActive } = req.body;
    await supplier.update({
      ...(name !== undefined && { name }),
      ...(contactPhone !== undefined && { contactPhone: contactPhone || null }),
      ...(contactEmail !== undefined && { contactEmail: contactEmail || null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(isActive !== undefined && { isActive }),
    });
    res.json(supplier);
  } catch (err) {
    next(err);
  }
}

async function deleteSupplier(req, res, next) {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });

    const movementCount = await StockMovement.count({ where: { supplierId: supplier.id } });
    if (movementCount > 0) {
      return res.status(409).json({ message: "This supplier has purchase history and can't be deleted. Mark it inactive instead." });
    }

    await supplier.destroy();
    logger.info("supplier.deleted", { userId: req.user.id, supplierId: supplier.id, name: supplier.name });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// Every ingredient ever bought from this supplier, aggregated across all of
// history (not just the 200-row window stockController.listMovements caps
// at) -- the totals a "what do we buy from them" view actually needs.
async function getSupplierItems(req, res, next) {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });

    const rows = await sequelize.query(
      `SELECT i.id AS ingredient_id, i.name, i.unit,
              SUM(m.quantity_change) AS total_quantity,
              SUM(m.quantity_change * COALESCE(m.unit_cost, 0)) AS total_spend,
              MAX(m.created_at) AS last_purchased_at
       FROM stock_movements m
       JOIN ingredients i ON i.id = m.ingredient_id
       WHERE m.type = 'purchase' AND m.supplier_id = :supplierId
       GROUP BY i.id, i.name, i.unit
       ORDER BY total_spend DESC`,
      { replacements: { supplierId: supplier.id }, type: sequelize.QueryTypes.SELECT }
    );
    res.json(
      rows.map((r) => ({
        ingredientId: r.ingredient_id,
        name: r.name,
        unit: r.unit,
        totalQuantity: Number(r.total_quantity),
        totalSpend: Number(r.total_spend),
        lastPurchasedAt: r.last_purchased_at,
      }))
    );
  } catch (err) {
    next(err);
  }
}

async function getSupplierSpendTrend(req, res, next) {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });

    const months = boundedInt(req.query.months, 6, 1, 24);
    const rows = await sequelize.query(
      `SELECT DATE_TRUNC('month', created_at) AS month,
              SUM(quantity_change * COALESCE(unit_cost, 0)) AS total_spend
       FROM stock_movements
       WHERE type = 'purchase' AND supplier_id = :supplierId
         AND created_at >= NOW() - INTERVAL '${months} months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month ASC`,
      { replacements: { supplierId: supplier.id }, type: sequelize.QueryTypes.SELECT }
    );
    res.json(rows.map((r) => ({ month: r.month, totalSpend: Number(r.total_spend) })));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierItems,
  getSupplierSpendTrend,
};
