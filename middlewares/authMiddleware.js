const jwt = require("jsonwebtoken");
const { User } = require("../models");

// Verifies the JWT, loads the current user, and attaches it to req. No
// vendor/branch concept here -- this app is single-tenant, unlike
// restaurant-billing-backend's protect middleware.
async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(payload.id);
    if (!user || user.status !== "active") {
      return res.status(401).json({ message: "Not authenticated" });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

module.exports = { protect, authorizeRoles };
