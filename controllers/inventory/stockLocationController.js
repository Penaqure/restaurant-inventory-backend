const { StockLocation } = require("../../models");
const logger = require("../../utils/logger");

async function listLocations(req, res, next) {
  try {
    const locations = await StockLocation.findAll({ order: [["name", "ASC"]] });
    res.json(locations);
  } catch (err) {
    next(err);
  }
}

async function createLocation(req, res, next) {
  try {
    const { name, address } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const location = await StockLocation.create({ name, address: address || null });
    logger.info("stock_location.created", { userId: req.user.id, locationId: location.id, name });
    res.status(201).json(location);
  } catch (err) {
    next(err);
  }
}

async function updateLocation(req, res, next) {
  try {
    const location = await StockLocation.findByPk(req.params.id);
    if (!location) return res.status(404).json({ message: "Location not found" });

    const { name, address, isActive } = req.body;
    await location.update({
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address: address || null }),
      ...(isActive !== undefined && { isActive }),
    });
    res.json(location);
  } catch (err) {
    next(err);
  }
}

module.exports = { listLocations, createLocation, updateLocation };
