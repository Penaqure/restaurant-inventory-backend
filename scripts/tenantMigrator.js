const path = require("path");
const { Sequelize } = require("sequelize");
const Umzug = require("umzug");
const config = require("../config/config")[process.env.NODE_ENV || "development"];
const cls = require("../config/cls");
const { assertSafeSchemaName } = require("../services/tenantContext");

const TENANT_MIGRATIONS_PATH = path.resolve(__dirname, "..", "migrations", "tenant");

// Runs the tenant migration files (migrations/tenant/*.js, unmodified)
// against a given schema, using a dedicated, short-lived Sequelize
// connection rather than the shared app-wide `sequelize` singleton used to
// serve requests.
//
// Two things have to both be true for a migration file to land in the
// right schema without ever mentioning schemas itself:
//
// 1. Most queryInterface calls (createTable, and anything that builds
//    unqualified SQL) resolve their table purely through the connection's
//    Postgres search_path -- so the whole migration run needs to happen on
//    ONE held connection with `SET LOCAL search_path` applied, not on
//    whatever connection an unpooled/unwrapped query happens to get (a
//    fresh connection from the pool starts with Postgres's own default
//    search_path, not ours). Hence wrapping the run in a transaction here,
//    the same pattern tenantContext.runInTenantSchema uses.
//
// 2. A handful of queryInterface methods (addColumn/removeColumn/
//    changeColumn/addIndex/describeTable, and inline FK `references`
//    inside createTable) are built on
//    QueryGenerator#extractTableDetails, which ignores search_path
//    entirely and hardcodes a schema of "public" unless the *Sequelize
//    instance itself* was constructed with a `schema` option. That's why
//    this uses its own disposable instance (constructed with
//    `schema: schemaName`) instead of the shared singleton -- setting that
//    option on the shared instance would be a global, mutable, concurrent-
//    request-affecting default; a throwaway instance has no such risk.
async function migrateTenantSchema(schemaName) {
  assertSafeSchemaName(schemaName);
  const sequelize = new Sequelize(process.env[config.use_env_variable], {
    dialect: config.dialect,
    logging: false,
    dialectOptions: config.dialectOptions,
    schema: schemaName,
  });
  try {
    return await cls.storage.run(new Map(), async () => {
      const t = await sequelize.transaction();
      Sequelize._cls.set("transaction", t);
      try {
        await sequelize.query(`SET LOCAL search_path TO "${schemaName}", public`, { transaction: t });
        const umzug = new Umzug({
          storage: "sequelize",
          storageOptions: { sequelize, tableName: "SequelizeMeta" },
          migrations: {
            params: [sequelize.getQueryInterface(), Sequelize],
            path: TENANT_MIGRATIONS_PATH,
            pattern: /\.js$/,
          },
          logging: false,
        });
        const result = await umzug.up();
        await t.commit();
        return result;
      } catch (err) {
        if (!t.finished) await t.rollback();
        throw err;
      }
    });
  } finally {
    await sequelize.close();
  }
}

module.exports = { migrateTenantSchema };
