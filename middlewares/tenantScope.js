const { Sequelize } = require("sequelize");
const sequelize = require("../config/db");
const cls = require("../config/cls");
const { assertSafeSchemaName } = require("../services/tenantContext");
const { User } = require("../models");
const logger = require("../utils/logger");

// Opens a transaction for the lifetime of the whole request, points its
// connection's search_path at the current tenant's schema, and commits or
// rolls back based on the eventual response -- not on whether a callback
// throws, since Express error handling (controller calls next(err), or a
// rejected promise auto-forwarded by Express 5) never throws back into this
// middleware's own stack frame the way Sequelize's auto-callback
// `transaction(async t => {...})` form expects. That's why this uses the
// manual transaction form and registers it in CLS itself.
function openTenantTransaction(req, res, next) {
  cls.storage.run(new Map(), () => {
    runRequest(req, res, next).catch((err) => next(err));
  });
}

async function runRequest(req, res, next) {
  let t;
  try {
    assertSafeSchemaName(req.restaurant.schemaName);
    t = await sequelize.transaction();
    Sequelize._cls.set("transaction", t);
    await sequelize.query(`SET LOCAL search_path TO "${req.restaurant.schemaName}", public`, {
      transaction: t,
    });

    const user = await User.findByPk(req.tokenPayload.sub);
    if (!user || user.status !== "active") {
      await t.rollback();
      return res.status(401).json({ message: "Not authenticated" });
    }
    req.user = user;
    req.dbTransaction = t;

    res.once("finish", () => {
      if (t.finished) return;
      const settle = res.statusCode >= 500 ? t.rollback() : t.commit();
      settle.catch((err) => logger.error("tenant_tx.settle_failed", { error: err.message }));
    });
    res.once("close", () => {
      if (!t.finished) t.rollback().catch(() => {});
    });

    next();
  } catch (err) {
    if (t && !t.finished) await t.rollback().catch(() => {});
    next(err);
  }
}

module.exports = { openTenantTransaction };
