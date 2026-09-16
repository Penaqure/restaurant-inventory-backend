const logger = require("../utils/logger");

// Thin client for restaurant-billing-backend's read-only, API-key-gated
// integration API (see that app's routes/integrationRoutes.js). Not in any
// critical path -- this system's own stock/purchasing data stays authoritative
// regardless of whether billing is reachable; these calls only feed
// reporting views.
async function billingFetch(path, params = {}) {
  const url = new URL(`${process.env.BILLING_API_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });

  const res = await fetch(url, {
    headers: { "X-API-Key": process.env.BILLING_INTEGRATION_API_KEY },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Billing integration request failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function getMenuItems() {
  try {
    return await billingFetch("/integrations/menu-items");
  } catch (err) {
    logger.error("billing_integration.menu_items_failed", { error: err.message });
    return [];
  }
}

async function getSalesSummary({ from, to } = {}) {
  try {
    return await billingFetch("/integrations/sales-summary", { from, to });
  } catch (err) {
    logger.error("billing_integration.sales_summary_failed", { error: err.message });
    return [];
  }
}

module.exports = { getMenuItems, getSalesSummary };
