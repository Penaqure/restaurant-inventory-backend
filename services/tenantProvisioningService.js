const bcrypt = require("bcryptjs");
const sequelize = require("../config/db");
const { Restaurant, User, UserDirectory } = require("../models");
const { runInTenantSchema, assertSafeSchemaName } = require("./tenantContext");
const { migrateTenantSchema } = require("../scripts/tenantMigrator");
const logger = require("../utils/logger");

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function assertValidSlug(slug) {
  if (typeof slug !== "string" || slug.length < 2 || slug.length > 50 || !SLUG_PATTERN.test(slug)) {
    const err = new Error("slug must be 2-50 characters: lowercase letters, digits and single hyphens");
    err.status = 400;
    throw err;
  }
}

function deriveSchemaName(slug) {
  return `tenant_${slug.replace(/-/g, "_")}`;
}

// Creates a restaurant's registry row, its own Postgres schema, applies the
// full tenant migration set to it, and seeds its first admin user -- all in
// one call so a restaurant either ends up fully usable or is cleaned back up.
async function provisionRestaurant({ name, slug, adminName, adminEmail, adminPassword }) {
  assertValidSlug(slug);
  if (!name || !adminName || !adminEmail || !adminPassword) {
    const err = new Error("name, slug, adminName, adminEmail and adminPassword are required");
    err.status = 400;
    throw err;
  }
  if (adminPassword.length < 8) {
    const err = new Error("adminPassword must be at least 8 characters");
    err.status = 400;
    throw err;
  }

  const schemaName = deriveSchemaName(slug);
  assertSafeSchemaName(schemaName);
  const email = adminEmail.toLowerCase();

  // Fail fast, before creating anything, if this email is already someone
  // else's login -- email is the sole login key across the whole platform
  // now, so it has to be globally unique, not just unique per restaurant.
  if (await UserDirectory.findOne({ where: { email } })) {
    const err = new Error("adminEmail is already registered to another restaurant");
    err.status = 409;
    throw err;
  }

  const restaurant = await Restaurant.create({ name, slug, schemaName, status: "active" });

  try {
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    await migrateTenantSchema(schemaName);

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const adminUser = await runInTenantSchema(schemaName, (t) =>
      User.create({ name: adminName, email, passwordHash, role: "admin" }, { transaction: t })
    );
    await UserDirectory.create({ email, restaurantId: restaurant.id, tenantUserId: adminUser.id });
  } catch (err) {
    logger.error("restaurant.provisioning_failed", { slug, schemaName, error: err.message });
    await sequelize.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`).catch(() => {});
    await restaurant.destroy().catch(() => {});
    throw err;
  }

  return { restaurant, adminEmail: email };
}

module.exports = { provisionRestaurant, deriveSchemaName, assertValidSlug };
