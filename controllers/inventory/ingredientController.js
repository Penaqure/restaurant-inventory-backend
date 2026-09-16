const { sequelize, Ingredient, IngredientStock, StockMovement, StockLocation } = require("../../models");
const logger = require("../../utils/logger");

async function listIngredients(req, res, next) {
  try {
    const ingredients = await Ingredient.findAll({ order: [["name", "ASC"]] });
    res.json(ingredients);
  } catch (err) {
    next(err);
  }
}

async function createIngredient(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { name, unit, linkedMenuItemName } = req.body;
    if (!name || !unit) {
      await t.rollback();
      return res.status(400).json({ message: "name and unit are required" });
    }

    const ingredient = await Ingredient.create(
      { name, unit, linkedMenuItemName: linkedMenuItemName || null },
      { transaction: t }
    );

    // Every current stock location gets a zero-stock row immediately.
    const locations = await StockLocation.findAll({ transaction: t });
    if (locations.length > 0) {
      await IngredientStock.bulkCreate(
        locations.map((l) => ({ stockLocationId: l.id, ingredientId: ingredient.id })),
        { transaction: t }
      );
    }

    await t.commit();
    logger.info("ingredient.created", { userId: req.user.id, ingredientId: ingredient.id, name });
    res.status(201).json(ingredient);
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

async function updateIngredient(req, res, next) {
  try {
    const ingredient = await Ingredient.findByPk(req.params.id);
    if (!ingredient) return res.status(404).json({ message: "Ingredient not found" });

    const { name, unit, linkedMenuItemName, isActive } = req.body;
    await ingredient.update({
      ...(name !== undefined && { name }),
      ...(unit !== undefined && { unit }),
      ...(linkedMenuItemName !== undefined && { linkedMenuItemName: linkedMenuItemName || null }),
      ...(isActive !== undefined && { isActive }),
    });
    res.json(ingredient);
  } catch (err) {
    next(err);
  }
}

async function deleteIngredient(req, res, next) {
  try {
    const ingredient = await Ingredient.findByPk(req.params.id);
    if (!ingredient) return res.status(404).json({ message: "Ingredient not found" });

    const movementCount = await StockMovement.count({ where: { ingredientId: ingredient.id } });
    if (movementCount > 0) {
      return res.status(409).json({ message: "This ingredient has stock history and can't be deleted. Mark it inactive instead." });
    }

    await ingredient.destroy();
    logger.info("ingredient.deleted", { userId: req.user.id, ingredientId: ingredient.id, name: ingredient.name });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listStock(req, res, next) {
  try {
    const where = {};
    if (req.query.stockLocationId) where.stockLocationId = req.query.stockLocationId;

    const stock = await IngredientStock.findAll({
      where,
      include: [
        { model: Ingredient, as: "ingredient", attributes: ["id", "name", "unit", "isActive"] },
        { model: StockLocation, as: "stockLocation", attributes: ["id", "name"] },
      ],
      order: [[{ model: Ingredient, as: "ingredient" }, "name", "ASC"]],
    });
    res.json(stock);
  } catch (err) {
    next(err);
  }
}

module.exports = { listIngredients, createIngredient, updateIngredient, deleteIngredient, listStock };
