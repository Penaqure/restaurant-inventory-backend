const PAYMENT_METHODS = ["cash", "upi", "bank_transfer"];

function normalizePaymentMethod(value, fallback = "cash") {
  return PAYMENT_METHODS.includes(value) ? value : fallback;
}

module.exports = { PAYMENT_METHODS, normalizePaymentMethod };
