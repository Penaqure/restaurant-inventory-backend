const express = require("express");
const authController = require("../controllers/auth/authController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/login", authController.login);
router.get("/me", protect, authController.me);
router.post("/change-password", protect, authController.changePassword);

module.exports = router;
