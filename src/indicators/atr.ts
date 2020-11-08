/**
 * ATR(period) using Wilder smoothing, from OHLC arrays (oldest to newest)
 */
export function averageTrueRange(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): number[] {
  const n = closes.length;
  if (n === 0) {
    return [];
  }
  if (n !== highs.length || n !== lows.length) {
    throw new Error('ATR: array length mismatch');
  }
  const tr: number[] = new Array(n);
  tr[0] = highs[0]! - lows[0]!;
  for (let i = 1; i < n; i++) {
    const hl = highs[i]! - lows[i]!;
    const hc = Math.abs(highs[i]! - closes[i - 1]!);
    const lc = Math.abs(lows[i]! - closes[i - 1]!);
    tr[i] = Math.max(hl, hc, lc);
  }
  const atr: number[] = new Array(n).fill(Number.NaN);
  if (n < period) {
    return atr;
  }
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += tr[i]!;
  }
  atr[period - 1] = sum / period;
  for (let i = period; i < n; i++) {
    const prev = atr[i - 1]!;
    atr[i] = (prev * (period - 1) + tr[i]!) / period;
  }
  return atr;
}
