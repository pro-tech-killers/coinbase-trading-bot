import { emaPeriod } from '../indicators/ema.js';
import { averageTrueRange } from '../indicators/atr.js';
import type { AppConfig } from '../config.js';

export type StrategySignal = 'BUY' | 'SELL' | 'HOLD';

export type StrategyOutput = {
  signal: StrategySignal;
  lastClose: number;
  emaFast: number;
  emaSlow: number;
  emaTrend: number;
  atr: number;
  inUptrend: boolean;
  crossUp: boolean;
  crossDown: boolean;
  reason: string;
};

function minBarsFor(cfg: AppConfig): number {
  return Math.max(300, cfg.EMA_TREND + 50, cfg.ATR_PERIOD + 5);
}

/**
 * EMA(12) × EMA(26) crossover with EMA(200) trend filter — same building blocks as MACD
 * and a standard trend filter used across retail and pro systematic trading resources.
 * Long: bullish cross when price & cross above EMA(200). Exit: bearish cross.
 */
export function evaluateEmaCrossTrend(
  cfg: AppConfig,
  highs: number[],
  lows: number[],
  closes: number[]
): StrategyOutput {
  const n = closes.length;
  const need = minBarsFor(cfg);
  if (n < need) {
    return {
      signal: 'HOLD',
      lastClose: closes[n - 1] ?? 0,
      emaFast: Number.NaN,
      emaSlow: Number.NaN,
      emaTrend: Number.NaN,
      atr: Number.NaN,
      inUptrend: false,
      crossUp: false,
      crossDown: false,
      reason: `Need at least ${need} candles, have ${n}`,
    };
  }

  const emaF = emaPeriod(closes, cfg.EMA_FAST);
  const emaS = emaPeriod(closes, cfg.EMA_SLOW);
  const emaT = emaPeriod(closes, cfg.EMA_TREND);
  const atrSeries = averageTrueRange(highs, lows, closes, cfg.ATR_PERIOD);

  const i = n - 1;
  const iPrev = n - 2;
  const lastClose = closes[i]!;

  const fast = emaF[i]!;
  const slow = emaS[i]!;
  const trend = emaT[i]!;
  const fastP = emaF[iPrev]!;
  const slowP = emaS[iPrev]!;
  const atr = atrSeries[i]!;

  const crossUp = fastP <= slowP && fast > slow;
  const crossDown = fastP >= slowP && fast < slow;
  const inUptrend = lastClose > trend;

  let signal: StrategySignal = 'HOLD';
  let reason = 'No crossover';

  if (crossUp && inUptrend) {
    signal = 'BUY';
    reason = 'Bullish EMA cross, price above EMA(trend)';
  } else if (crossDown) {
    signal = 'SELL';
    reason = 'Bearish EMA cross (exit / reduce)';
  } else if (crossUp && !inUptrend) {
    reason = 'Bullish cross but below EMA(trend) — no long';
  }

  return {
    signal,
    lastClose,
    emaFast: fast,
    emaSlow: slow,
    emaTrend: trend,
    atr: Number.isFinite(atr) ? atr : 0,
    inUptrend,
    crossUp,
    crossDown,
    reason,
  };
}
