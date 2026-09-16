const { Restaurant } = require("../../models");
const { provisionRestaurant } = require("../../services/tenantProvisioningService");
const logger = require("../../utils/logger");

async function listRestaurants(req, res, next) {
  try {
    const restaurants = await Restaurant.findAll({ order: [["name", "ASC"]] });
    res.json(restaurants);
  } catch (err) {
    next(err);
  }
}

async function createRestaurant(req, res, next) {
  try {
    const { name, slug, adminName, adminEmail, adminPassword } = req.body;
    const { restaurant, adminEmail: createdAdminEmail } = await provisionRestaurant({
      name,
      slug,
      adminName,
      adminEmail,
      adminPassword,
    });
    logger.info("restaurant.created", { adminId: req.platformAdmin.id, restaurantId: restaurant.id, slug });
    res.status(201).json({ restaurant, adminEmail: createdAdminEmail });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

async function updateRestaurantStatus(req, res, next) {
  try {
    const restaurant = await Restaurant.findByPk(req.params.id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const { status } = req.body;
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ message: "status must be 'active' or 'suspended'" });
    }

    await restaurant.update({ status });
    logger.info("restaurant.status_updated", { adminId: req.platformAdmin.id, restaurantId: restaurant.id, status });
    res.json(restaurant);
  } catch (err) {
    next(err);
  }
}

module.exports = { listRestaurants, createRestaurant, updateRestaurantStatus };
