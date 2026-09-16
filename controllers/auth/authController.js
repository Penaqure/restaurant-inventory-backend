const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Restaurant, User } = require("../../models");
const { runInTenantSchema } = require("../../services/tenantContext");
const logger = require("../../utils/logger");

function signToken(user, restaurant) {
  return jwt.sign(
    { sub: user.id, role: user.role, restaurantId: restaurant.id, schema: restaurant.schemaName, type: "tenant" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

async function login(req, res, next) {
  try {
    const { restaurantSlug, email, password } = req.body;
    if (!restaurantSlug || !email || !password) {
      return res.status(400).json({ message: "restaurantSlug, email and password are required" });
    }

    const restaurant = await Restaurant.findOne({ where: { slug: restaurantSlug.toLowerCase() } });
    if (!restaurant || restaurant.status !== "active") {
      logger.warn("auth.login_failed", { restaurantSlug, reason: "unknown_or_inactive_restaurant" });
      return res.status(401).json({ message: "Invalid restaurant, email or password" });
    }

    const user = await runInTenantSchema(restaurant.schemaName, (t) =>
      User.scope("withPassword").findOne({ where: { email: email.toLowerCase() }, transaction: t })
    );

    if (!user || !(await user.comparePassword(password))) {
      logger.warn("auth.login_failed", { restaurantSlug, email: email.toLowerCase() });
      return res.status(401).json({ message: "Invalid restaurant, email or password" });
    }
    if (user.status !== "active") {
      return res.status(403).json({ message: "This account has been disabled." });
    }

    await runInTenantSchema(restaurant.schemaName, async (t) => {
      user.lastLoginAt = new Date();
      await user.save({ transaction: t });
    });

    const token = signToken(user, restaurant);
    logger.info("auth.login_success", { userId: user.id, restaurantId: restaurant.id, role: user.role });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      restaurant: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug },
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = req.user;
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      restaurant: { id: req.restaurant.id, name: req.restaurant.name, slug: req.restaurant.slug },
    });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "currentPassword and newPassword are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "newPassword must be at least 8 characters" });
    }

    const user = await User.scope("withPassword").findByPk(req.user.id);
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    logger.info("auth.password_changed", { userId: user.id });

    res.json({ message: "Password updated" });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me, changePassword };
