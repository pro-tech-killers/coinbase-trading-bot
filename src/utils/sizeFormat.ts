/**
 * Truncate to quote precision (2 dp for most fiat) and ensure >= min
 */
export function toQuoteString(amount: number, quoteMin: string, decimals = 2): string | null {
  if (amount <= 0) {
    return null;
  }
  const min = parseFloat(quoteMin);
  const t = 10 ** decimals;
  const x = Math.floor(amount * t) / t;
  if (x < min) {
    return null;
  }
  return x.toFixed(decimals);
}

/**
 * Truncate to 8dp for typical crypto base
 */
export function toBaseString(amount: number, baseMin: string): string | null {
  if (amount <= 0) {
    return null;
  }
  const min = parseFloat(baseMin);
  const x = Math.floor(amount * 1e8) / 1e8;
  if (x < min) {
    return null;
  }
  return x.toFixed(8);
}
