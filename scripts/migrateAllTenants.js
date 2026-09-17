require("dotenv").config();
const { Restaurant } = require("../models");
const { migrateTenantSchema } = require("./tenantMigrator");

// Applies any pending migrations/tenant/*.js to every already-provisioned
// restaurant's schema. New tenants get the full set automatically at
// provisioning time (tenantProvisioningService); this is what rolls a new
// tenant migration out to restaurants that already existed before it was
// added.
async function main() {
  const restaurants = await Restaurant.findAll();
  console.log(`Found ${restaurants.length} restaurant(s).`);
  for (const r of restaurants) {
    process.stdout.write(`Migrating ${r.slug} (${r.schemaName})... `);
    await migrateTenantSchema(r.schemaName);
    console.log("done");
  }
  console.log("All restaurants migrated.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
