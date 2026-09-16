const express = require("express");
const userController = require("../controllers/userController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

// Account management is admin only -- staff can't create or edit logins,
// including their own.
router.use(protect, authorizeRoles("admin"));

router.get("/", userController.listUsers);
router.post("/", userController.createUser);
router.patch("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

module.exports = router;
