require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PlatformAdmin } = require("../../models");

// Bootstraps the first platform super-admin (the account that provisions
// restaurants via /api/platform/*), not a tenant user -- tenant admin users
// are created per-restaurant via tenantProvisioningService instead.
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Platform Admin";

  if (!email || !password) {
    console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
    process.exit(1);
  }

  const existing = await PlatformAdmin.findOne({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.log(`Platform admin already exists: ${email}`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await PlatformAdmin.create({ name, email: email.toLowerCase(), passwordHash });

  console.log(`Platform admin created: ${email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
