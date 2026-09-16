const { Sequelize } = require("sequelize");
const sequelize = require("../config/db");
const cls = require("../config/cls");

const SCHEMA_NAME_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;

// Postgres identifiers can't be bound as query parameters, so any schema
// name reaching a SET LOCAL / CREATE SCHEMA statement is validated against
// this allowlist first as a defense-in-depth measure -- schema names are
// always derived from a restaurant's slug (see tenantProvisioningService),
// never taken verbatim from request input.
function assertSafeSchemaName(schemaName) {
  if (!SCHEMA_NAME_PATTERN.test(schemaName)) {
    throw new Error(`Refusing to use unsafe schema name: ${schemaName}`);
  }
}

// One-off tenant-schema work outside of an HTTP request (provisioning,
// migrations, scripts). Opens its own transaction, points the connection's
// search_path at the given tenant schema for the lifetime of that
// transaction only (SET LOCAL, not SET -- a plain SET would persist on the
// pooled connection past commit and leak into whichever request reuses that
// connection next), runs `work`, then commits/rolls back.
async function runInTenantSchema(schemaName, work) {
  assertSafeSchemaName(schemaName);
  // Sequelize.useCLS()'s namespace only actually stores anything set on it
  // while inside an active AsyncLocalStorage.run() -- calling cls.set()
  // outside of that silently no-ops (there's no store to write into), which
  // would leave every plain query in `work` without a transaction at all,
  // landing them on a fresh connection with whatever the ambient/default
  // search_path is instead of this schema.
  return cls.storage.run(new Map(), async () => {
    const t = await sequelize.transaction();
    Sequelize._cls.set("transaction", t);
    try {
      await sequelize.query(`SET LOCAL search_path TO "${schemaName}", public`, { transaction: t });
      const result = await work(t);
      await t.commit();
      return result;
    } catch (err) {
      if (!t.finished) await t.rollback();
      throw err;
    }
  });
}

module.exports = { runInTenantSchema, assertSafeSchemaName, SCHEMA_NAME_PATTERN };
