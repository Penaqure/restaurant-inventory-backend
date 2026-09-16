const express = require("express");
const authController = require("../controllers/auth/authController");
const { protect } = require("../middlewares/authMiddleware");
const { openTenantTransaction } = require("../middlewares/tenantScope");

const router = express.Router();

router.post("/login", authController.login);
router.get("/me", protect, openTenantTransaction, authController.me);
router.post("/change-password", protect, openTenantTransaction, authController.changePassword);

module.exports = router;
