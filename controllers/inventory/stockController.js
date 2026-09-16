const { Op } = require("sequelize");
const { sequelize, Ingredient, IngredientStock, StockMovement, StockLocation, Supplier, User } = require("../../models");
const logger = require("../../utils/logger");
const notificationService = require("../../services/notificationService");

const MOVEMENT_TYPES = ["purchase", "adjustment", "wastage", "issue"];

const movementIncludes = [
  { model: Ingredient, as: "ingredient", attributes: ["id", "name", "unit"] },
  { model: StockLocation, as: "stockLocation", attributes: ["id", "name"] },
  { model: Supplier, as: "supplier", attributes: ["id", "name"] },
  { model: User, as: "recordedBy", attributes: ["id", "name"] },
];

// purchase is always a positive restock; wastage/issue are always a
// negative outflow, regardless of the sign the caller sent. adjustment is
// the one type where the caller's sign is authoritative (a stock-count
// correction can go either way).
async function recordMovement(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { ingredientId, stockLocationId, supplierId, type, quantity, unitCost, note } = req.body;
    const paymentStatus = req.body.paymentStatus === "credit" ? "credit" : "paid";

    if (!MOVEMENT_TYPES.includes(type)) {
      await t.rollback();
      return res.status(400).json({ message: `type must be one of ${MOVEMENT_TYPES.join(", ")}` });
    }
    if (!ingredientId || !stockLocationId) {
      await t.rollback();
      return res.status(400).json({ message: "ingredientId and stockLocationId are required" });
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty === 0) {
      await t.rollback();
      return res.status(400).json({ message: "quantity must be a non-zero number" });
    }
    if (type === "purchase" && paymentStatus === "credit" && !supplierId) {
      await t.rollback();
      return res.status(400).json({ message: "supplierId is required for a credit purchase" });
    }

    const location = await StockLocation.findByPk(stockLocationId, { transaction: t });
    if (!location) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid stock location" });
    }
    const ingredient = await Ingredient.findByPk(ingredientId, { transaction: t });
    if (!ingredient) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid ingredient" });
    }
    if (supplierId) {
      const supplier = await Supplier.findByPk(supplierId, { transaction: t });
      if (!supplier) {
        await t.rollback();
        return res.status(400).json({ message: "Invalid supplier" });
      }
    }

    let quantityChange;
    if (type === "purchase") quantityChange = Math.abs(qty);
    else if (type === "wastage" || type === "issue") quantityChange = -Math.abs(qty);
    else quantityChange = qty; // adjustment

    const [stockRow] = await IngredientStock.findOrCreate({
      where: { stockLocationId, ingredientId },
      defaults: { quantityOnHand: 0, lowStockThreshold: 0 },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    await stockRow.update({ quantityOnHand: Number(stockRow.quantityOnHand) + quantityChange }, { transaction: t });

    const movement = await StockMovement.create(
      {
        stockLocationId,
        ingredientId,
        supplierId: type === "purchase" ? supplierId || null : null,
        type,
        quantityChange,
        unitCost: type === "purchase" && unitCost ? unitCost : null,
        paymentStatus: type === "purchase" ? paymentStatus : "paid",
        note: note || null,
        createdBy: req.user.id,
      },
      { transaction: t }
    );

    await t.commit();
    logger.info("stock_movement.recorded", { userId: req.user.id, ingredientId, stockLocationId, type, quantityChange });

    const created = await StockMovement.findByPk(movement.id, { include: movementIncludes });
    const reloadedStock = await stockRow.reload();

    notificationService.checkLowStock({ ingredientStockId: reloadedStock.id, actorUserId: req.user.id });
    if (type === "purchase" && paymentStatus === "credit") {
      notificationService.emitToRoles(["admin"], "supplier:credit_purchase", {
        supplierId: created.supplierId,
        supplierName: created.supplier?.name,
        ingredientName: created.ingredient.name,
        quantity: Math.abs(quantityChange),
        unit: created.ingredient.unit,
        unitCost: created.unitCost,
        actorUserId: req.user.id,
      });
    }

    res.status(201).json({ movement: created, stock: reloadedStock });
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

async function listMovements(req, res, next) {
  try {
    const where = {};
    if (req.query.ingredientId) where.ingredientId = req.query.ingredientId;
    if (req.query.stockLocationId) where.stockLocationId = req.query.stockLocationId;
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt[Op.gte] = new Date(`${req.query.from}T00:00:00`);
      if (req.query.to) where.createdAt[Op.lte] = new Date(`${req.query.to}T23:59:59.999`);
    }

    const movements = await StockMovement.findAll({
      where,
      include: movementIncludes,
      order: [["createdAt", "DESC"]],
      limit: 200,
    });
    res.json(movements);
  } catch (err) {
    next(err);
  }
}

module.exports = { recordMovement, listMovements };
