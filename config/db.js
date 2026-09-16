const { Sequelize } = require("sequelize");
const config = require("./config")[process.env.NODE_ENV || "development"];
const cls = require("./cls");

// Enables Sequelize's built-in CLS support so a request-scoped transaction
// (see middlewares/tenantScope.js) is picked up automatically by every plain
// query made anywhere during that request, with no `{transaction}` passed
// explicitly -- this is what lets existing models/controllers stay untouched
// while still being scoped to the right tenant schema.
Sequelize.useCLS(cls);

const sequelize = new Sequelize(process.env[config.use_env_variable], {
  dialect: config.dialect,
  logging: config.logging,
  dialectOptions: config.dialectOptions,
  // Every authenticated request now holds a connection for its full
  // lifetime (see middlewares/tenantScope.js), so this pool is sized larger
  // than Sequelize's default (max: 5) -- still comfortably under Postgres's
  // own default max_connections (100).
  pool: { max: 15, min: 0, idle: 10000, acquire: 30000 },
});

// A bare `sequelize.transaction()` call (several controllers already make
// one to wrap a multi-step write) does NOT automatically nest under the
// current CLS transaction -- Sequelize only defaults `options.transaction`
// from CLS inside the plain-query path, not inside the Transaction
// constructor itself. Without this patch, those controllers would silently
// open a second connection whose search_path doesn't point at the tenant's
// schema. Patching here makes every ad-hoc transaction nest as a SAVEPOINT
// of the current request transaction when one is active, reusing its
// connection (and therefore its search_path) -- calls that already pass an
// explicit `{transaction}` are unaffected.
const originalTransaction = sequelize.transaction.bind(sequelize);
sequelize.transaction = function patchedTransaction(options, autoCallback) {
  if (typeof options === "function") {
    autoCallback = options;
    options = {};
  }
  options = options || {};
  if (options.transaction === undefined) {
    const current = Sequelize._cls && Sequelize._cls.get("transaction");
    if (current) options.transaction = current;
  }
  return originalTransaction(options, autoCallback);
};

module.exports = sequelize;
