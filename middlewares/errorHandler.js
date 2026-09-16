const logger = require("../utils/logger");

function notFound(req, res) {
  logger.warn("route.not_found", { method: req.method, url: req.originalUrl });
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  const context = {
    method: req.method,
    url: req.originalUrl,
    status,
    userId: req.user?.id,
  };

  if (status >= 500) {
    logger.error(err.message, { ...context, stack: err.stack });
  } else {
    logger.warn(err.message, context);
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({ message: "A record with these details already exists" });
  }
  if (err.name === "SequelizeValidationError") {
    return res.status(400).json({ message: err.errors.map((e) => e.message).join(", ") });
  }

  res.status(status).json({ message: status === 500 ? "Internal server error" : err.message });
}

module.exports = { notFound, errorHandler };
