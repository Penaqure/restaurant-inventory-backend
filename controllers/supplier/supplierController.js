const { Supplier, StockMovement } = require("../../models");
const logger = require("../../utils/logger");

async function listSuppliers(req, res, next) {
  try {
    const suppliers = await Supplier.findAll({ order: [["name", "ASC"]] });
    res.json(suppliers);
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

module.exports = { listSuppliers, createSupplier, updateSupplier, deleteSupplier };
