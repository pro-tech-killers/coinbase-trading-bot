/**
 * Exponential moving average. Seeds with the first close, then EMA = EMA + k * (price - EMA)
 */
export function emaPeriod(values: number[], period: number): number[] {
  if (values.length === 0) {
    return [];
  }
  if (period < 1) {
    throw new Error('EMA period must be at least 1');
  }
  const k = 2 / (period + 1);
  const out: number[] = [values[0]!];
  for (let i = 1; i < values.length; i++) {
    out[i] = (values[i]! - out[i - 1]!) * k + out[i - 1]!;
  }
  return out;
}
