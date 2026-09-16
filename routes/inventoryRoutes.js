const express = require("express");
const stockLocationController = require("../controllers/inventory/stockLocationController");
const ingredientController = require("../controllers/inventory/ingredientController");
const stockController = require("../controllers/inventory/stockController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/locations", stockLocationController.listLocations);
router.post("/locations", authorizeRoles("admin"), stockLocationController.createLocation);
router.patch("/locations/:id", authorizeRoles("admin"), stockLocationController.updateLocation);

router.get("/ingredients", ingredientController.listIngredients);
router.post("/ingredients", authorizeRoles("admin"), ingredientController.createIngredient);
router.patch("/ingredients/:id", authorizeRoles("admin"), ingredientController.updateIngredient);
router.delete("/ingredients/:id", authorizeRoles("admin"), ingredientController.deleteIngredient);

router.get("/stock", ingredientController.listStock);

router.post("/movements", stockController.recordMovement);
router.get("/movements", stockController.listMovements);

module.exports = router;
