/** Compact form for KPI tiles/charts, e.g. 1250000 -> "₹12.5L". Falls back to formatCurrency for small numbers. */
export function formatCompactCurrency(value) {
  const n = Number(value || 0);
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return formatCurrency(n);
}

/** Full precision form for tables/details, e.g. 1250000 -> "₹12,50,000.00". */
export function formatCurrency(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}
