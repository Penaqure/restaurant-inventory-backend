const bcrypt = require("bcryptjs");
const { User } = require("../models");
const logger = require("../utils/logger");

async function listUsers(req, res, next) {
  try {
    const users = await User.findAll({ order: [["name", "ASC"]] });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "password must be at least 8 characters" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role === "admin" ? "admin" : "staff",
    });
    logger.info("user.created", { userId: req.user.id, createdUserId: user.id, role: user.role });
    // The instance returned by .create() carries every attribute set on it
    // in memory, bypassing the model's defaultScope password exclusion --
    // re-fetching by id applies that scope so the hash never reaches the
    // response.
    res.status(201).json(await User.findByPk(user.id));
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, email, role, status, password } = req.body;

    // An admin can't lock themselves out -- no demoting or deactivating your
    // own account, matching the pattern used for self-service guardrails
    // elsewhere (e.g. a vendor can't delete a category still in use).
    if (user.id === req.user.id) {
      if (role && role !== "admin") {
        return res.status(400).json({ message: "You can't change your own role" });
      }
      if (status && status !== "active") {
        return res.status(400).json({ message: "You can't deactivate your own account" });
      }
    }

    const updates = {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email: email.toLowerCase() }),
      ...(role !== undefined && { role: role === "admin" ? "admin" : "staff" }),
      ...(status !== undefined && { status: status === "inactive" ? "inactive" : "active" }),
    };
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ message: "password must be at least 8 characters" });
      }
      updates.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.update(updates);
    logger.info("user.updated", { userId: req.user.id, updatedUserId: user.id });
    res.json(await User.findByPk(user.id));
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "You can't delete your own account" });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.destroy();
    logger.info("user.deleted", { userId: req.user.id, deletedUserId: user.id, name: user.name });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, createUser, updateUser, deleteUser };
