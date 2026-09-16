const express = require("express");
const billingController = require("../controllers/billingController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/menu-items", billingController.getMenuItems);
router.get("/sales-summary", billingController.getSalesSummary);

module.exports = router;
