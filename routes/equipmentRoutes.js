const express = require("express");
const equipmentController = require("../controllers/equipment/equipmentController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const { openTenantTransaction } = require("../middlewares/tenantScope");

const router = express.Router();

router.use(protect, openTenantTransaction);

router.get("/", equipmentController.listEquipment);
router.post("/", equipmentController.createEquipment);
router.patch("/:id", equipmentController.updateEquipment);
router.delete("/:id", authorizeRoles("admin"), equipmentController.deleteEquipment);

module.exports = router;
