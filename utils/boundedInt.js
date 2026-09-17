// Coerces a query-param string to a bounded integer before it's embedded in
// a raw SQL INTERVAL/LIMIT literal (node-postgres can't bind a parameter
// inside those cleanly) -- clamping here, not just parsing, is what makes
// that safe against injection.
function boundedInt(value, fallback, min, max) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

module.exports = { boundedInt };
