import { existsSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

// Local development database — separate from restaurant-billing-backend's
// own embedded Postgres (port 5434) and the other local project on 5433.
// This app's own DB, own port: 5436.
const databaseDir = path.join(process.cwd(), ".pgdata");
const alreadyInitialised = existsSync(path.join(databaseDir, "PG_VERSION"));

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "inventory_user",
  password: "inventory_pass",
  port: 5436,
  persistent: true,
});

if (!alreadyInitialised) {
  await pg.initialise();
}
await pg.start();
if (!alreadyInitialised) {
  await pg.createDatabase("inventory_system");
}

console.log(
  "Local Postgres ready — postgresql://inventory_user:inventory_pass@localhost:5436/inventory_system"
);

async function shutdown() {
  await pg.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
