const express = require("express");
const equipmentController = require("../controllers/equipment/equipmentController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", equipmentController.listEquipment);
router.post("/", equipmentController.createEquipment);
router.patch("/:id", equipmentController.updateEquipment);
router.delete("/:id", authorizeRoles("admin"), equipmentController.deleteEquipment);

module.exports = router;
