const { Equipment, StockLocation } = require("../../models");
const logger = require("../../utils/logger");
const notificationService = require("../../services/notificationService");

const CATEGORIES = ["crockery", "cutlery", "kitchen_equipment", "other"];
const CONDITIONS = ["good", "damaged", "under_repair", "retired"];

async function listEquipment(req, res, next) {
  try {
    const where = {};
    if (req.query.stockLocationId) where.stockLocationId = req.query.stockLocationId;

    const equipment = await Equipment.findAll({
      where,
      include: [{ model: StockLocation, as: "stockLocation", attributes: ["id", "name"] }],
      order: [["name", "ASC"]],
    });
    res.json(equipment);
  } catch (err) {
    next(err);
  }
}

async function createEquipment(req, res, next) {
  try {
    const { name, category, quantity, condition, stockLocationId, notes } = req.body;
    if (!name || !stockLocationId) {
      return res.status(400).json({ message: "name and stockLocationId are required" });
    }
    if (category && !CATEGORIES.includes(category)) {
      return res.status(400).json({ message: `category must be one of ${CATEGORIES.join(", ")}` });
    }
    if (condition && !CONDITIONS.includes(condition)) {
      return res.status(400).json({ message: `condition must be one of ${CONDITIONS.join(", ")}` });
    }

    const location = await StockLocation.findByPk(stockLocationId);
    if (!location) return res.status(400).json({ message: "Invalid stock location" });

    const item = await Equipment.create({
      name,
      category: category || "other",
      quantity: quantity ?? 0,
      condition: condition || "good",
      stockLocationId,
      notes: notes || null,
    });
    logger.info("equipment.created", { userId: req.user.id, equipmentId: item.id, name });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
}

async function updateEquipment(req, res, next) {
  try {
    const item = await Equipment.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: "Equipment not found" });

    const { name, category, quantity, condition, stockLocationId, notes } = req.body;
    if (category && !CATEGORIES.includes(category)) {
      return res.status(400).json({ message: `category must be one of ${CATEGORIES.join(", ")}` });
    }
    if (condition && !CONDITIONS.includes(condition)) {
      return res.status(400).json({ message: `condition must be one of ${CONDITIONS.join(", ")}` });
    }

    const previousCondition = item.condition;

    await item.update({
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(quantity !== undefined && { quantity }),
      ...(condition !== undefined && { condition }),
      ...(stockLocationId !== undefined && { stockLocationId }),
      ...(notes !== undefined && { notes: notes || null }),
    });
    logger.info("equipment.updated", { userId: req.user.id, equipmentId: item.id });

    if (condition && condition !== previousCondition && (condition === "damaged" || condition === "under_repair")) {
      notificationService.emitToAll(req.restaurant.id, "equipment:condition_alert", {
        equipmentId: item.id,
        name: item.name,
        condition,
        actorUserId: req.user.id,
      });
    }

    res.json(item);
  } catch (err) {
    next(err);
  }
}

async function deleteEquipment(req, res, next) {
  try {
    const item = await Equipment.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: "Equipment not found" });
    await item.destroy();
    logger.info("equipment.deleted", { userId: req.user.id, equipmentId: item.id, name: item.name });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listEquipment, createEquipment, updateEquipment, deleteEquipment };
