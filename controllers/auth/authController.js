const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../../models");
const logger = require("../../utils/logger");

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.scope("withPassword").findOne({ where: { email: email.toLowerCase() } });

    if (!user || !(await user.comparePassword(password))) {
      logger.warn("auth.login_failed", { email: email.toLowerCase() });
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (user.status !== "active") {
      return res.status(403).json({ message: "This account has been disabled." });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);
    logger.info("auth.login_success", { userId: user.id, role: user.role });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = req.user;
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
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
