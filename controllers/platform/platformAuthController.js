const jwt = require("jsonwebtoken");
const { PlatformAdmin } = require("../../models");
const logger = require("../../utils/logger");

function signToken(admin) {
  return jwt.sign({ sub: admin.id, type: "platform" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const admin = await PlatformAdmin.scope("withPassword").findOne({ where: { email: email.toLowerCase() } });
    if (!admin || !(await admin.comparePassword(password))) {
      logger.warn("platform_auth.login_failed", { email: email.toLowerCase() });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(admin);
    logger.info("platform_auth.login_success", { adminId: admin.id });

    res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const admin = req.platformAdmin;
    res.json({ id: admin.id, name: admin.name, email: admin.email });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me };
