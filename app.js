require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");

const requestLogger = require("./middlewares/requestLogger");
const { notFound, errorHandler } = require("./middlewares/errorHandler");
const authRoutes = require("./routes/authRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const equipmentRoutes = require("./routes/equipmentRoutes");
const payrollRoutes = require("./routes/payrollRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const userRoutes = require("./routes/userRoutes");
const billingRoutes = require("./routes/billingRoutes");
const platformAuthRoutes = require("./routes/platformAuthRoutes");
const platformRestaurantRoutes = require("./routes/platformRestaurantRoutes");
const sequelize = require("./config/db");
const logger = require("./utils/logger");
const notificationService = require("./services/notificationService");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());
app.use(requestLogger);

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/platform/auth", platformAuthRoutes);
app.use("/api/platform/restaurants", platformRestaurantRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5100;
const server = http.createServer(app);

sequelize
  .authenticate()
  .then(() => {
    logger.info("Database connection established");
    notificationService.init(server);
    server.listen(PORT, () => logger.info(`Inventory server listening on port ${PORT}`));
  })
  .catch((err) => {
    logger.error("Unable to connect to the database", { error: err.message });
    process.exit(1);
  });

module.exports = app;
