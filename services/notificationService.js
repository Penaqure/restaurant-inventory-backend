const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

let io = null;

// Rooms are scoped per-restaurant-then-role so an event for one restaurant
// never reaches a socket connected on behalf of a different restaurant --
// with multiple tenants sharing one process, a role-only room would leak
// every restaurant's financial/stock alerts to every other restaurant's
// admins.
function roleRoom(restaurantId, role) {
  return `restaurant:${restaurantId}:role:${role}`;
}

function init(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL || "*" },
  });

  // Same JWT the REST API issues, verified without a DB round-trip per
  // connection -- a deactivated user stays connected until the token
  // expires or the page reloads; the REST API remains the real access
  // control boundary. Only tenant-user tokens carry a restaurantId, so
  // platform-admin tokens are simply not accepted here.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Not authenticated"));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload.type !== "tenant" || !payload.restaurantId) {
        return next(new Error("Not authenticated"));
      }
      socket.userId = payload.sub;
      socket.role = payload.role;
      socket.restaurantId = payload.restaurantId;
      next();
    } catch {
      next(new Error("Not authenticated"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(roleRoom(socket.restaurantId, socket.role));
  });

  logger.info("notifications.socket_ready");
}

function emitToRoles(restaurantId, roles, event, payload) {
  if (!io || roles.length === 0) return;
  io.to(roles.map((role) => roleRoom(restaurantId, role))).emit(event, payload);
}

function emitToAll(restaurantId, event, payload) {
  emitToRoles(restaurantId, ["admin", "staff"], event, payload);
}

const LOW_STOCK_DEBOUNCE_MS = 30 * 60 * 1000;
const lastLowStockNotice = new Map(); // ingredientStockId -> ms timestamp

async function checkLowStock({ restaurantId, ingredientStockId, actorUserId }) {
  if (!io || !ingredientStockId) return;
  try {
    const { IngredientStock, Ingredient, StockLocation } = require("../models");
    const stockRow = await IngredientStock.findByPk(ingredientStockId, {
      include: [
        { model: Ingredient, as: "ingredient" },
        { model: StockLocation, as: "stockLocation" },
      ],
    });
    if (!stockRow) return;
    if (Number(stockRow.quantityOnHand) > Number(stockRow.lowStockThreshold)) return;

    const last = lastLowStockNotice.get(ingredientStockId) || 0;
    if (Date.now() - last < LOW_STOCK_DEBOUNCE_MS) return;
    lastLowStockNotice.set(ingredientStockId, Date.now());

    // Relevant to whoever handles day-to-day stock, not just admin.
    emitToAll(restaurantId, "stock:low_stock", {
      ingredientId: stockRow.ingredientId,
      ingredientName: stockRow.ingredient.name,
      unit: stockRow.ingredient.unit,
      locationName: stockRow.stockLocation.name,
      quantityOnHand: stockRow.quantityOnHand,
      lowStockThreshold: stockRow.lowStockThreshold,
      actorUserId,
    });
  } catch (err) {
    logger.error("notifications.low_stock_check_failed", { ingredientStockId, error: err.message });
  }
}

module.exports = { init, emitToRoles, emitToAll, checkLowStock };
