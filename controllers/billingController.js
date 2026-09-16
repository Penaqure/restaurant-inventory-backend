const billingIntegrationService = require("../services/billingIntegrationService");

async function getMenuItems(req, res, next) {
  try {
    res.json(await billingIntegrationService.getMenuItems());
  } catch (err) {
    next(err);
  }
}

async function getSalesSummary(req, res, next) {
  try {
    res.json(await billingIntegrationService.getSalesSummary({ from: req.query.from, to: req.query.to }));
  } catch (err) {
    next(err);
  }
}

module.exports = { getMenuItems, getSalesSummary };
