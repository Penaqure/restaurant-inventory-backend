const jwt = require("jsonwebtoken");
const { Restaurant, PlatformAdmin } = require("../models");

// Verifies a tenant-user JWT and confirms its restaurant is still active,
// but does NOT load req.user itself -- that happens in
// middlewares/tenantScope.js's openTenantTransaction, once the request's
// search_path has been pointed at the right tenant schema (the `users`
// table only exists inside a tenant's own schema, so it can't be queried
// before that). Restaurant is a schema:"public" model, so this lookup
// resolves correctly regardless of the connection's ambient search_path.
async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== "tenant") {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const restaurant = await Restaurant.findByPk(payload.restaurantId);
    if (!restaurant || restaurant.status !== "active") {
      return res.status(401).json({ message: "Not authenticated" });
    }

    req.tokenPayload = payload;
    req.restaurant = restaurant;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Verifies a platform-admin JWT for the /api/platform/* surface. Platform
// admins live in the public schema alongside Restaurant, so no tenant
// schema switching is needed here.
async function protectPlatform(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== "platform") {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const admin = await PlatformAdmin.findByPk(payload.sub);
    if (!admin) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    req.platformAdmin = admin;
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

module.exports = { protect, protectPlatform, authorizeRoles };
