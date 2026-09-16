const express = require("express");
const platformAuthController = require("../controllers/platform/platformAuthController");
const { protectPlatform } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/login", platformAuthController.login);
router.get("/me", protectPlatform, platformAuthController.me);

module.exports = router;
