const express = require("express");
const platformRestaurantController = require("../controllers/platform/platformRestaurantController");
const { protectPlatform } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protectPlatform);

router.get("/", platformRestaurantController.listRestaurants);
router.post("/", platformRestaurantController.createRestaurant);
router.patch("/:id", platformRestaurantController.updateRestaurantStatus);

module.exports = router;
