import { randomUUID } from 'node:crypto';
import { Coinbase, OrderSide, type Product } from 'coinbase-advanced-node';
import { createCoinbaseClient } from '../coinbase/createClient.js';
import { getConfig, parseProductId } from '../config.js';
import { evaluateEmaCrossTrend } from '../strategy/emaCrossTrendStrategy.js';
import { toBaseString, toQuoteString } from '../utils/sizeFormat.js';

function logLine(msg: string, data?: Record<string, unknown>): void {
  const ts = new Date().toISOString();
  if (data) {
    console.log(`[${ts}] ${msg}`, data);
  } else {
    console.log(`[${ts}] ${msg}`);
  }
}

async function readBalances(
  client: Coinbase,
  baseCur: string,
  quoteCur: string
): Promise<{ baseAvail: number; quoteAvail: number }> {
  const { data: accounts } = await client.rest.account.listAccounts();
  let baseAvail = 0;
  let quoteAvail = 0;
  for (const a of accounts) {
    if (a.currency === baseCur) {
      baseAvail = parseFloat(a.available_balance.value);
    }
    if (a.currency === quoteCur) {
      quoteAvail = parseFloat(a.available_balance.value);
    }
  }
  return { baseAvail, quoteAvail };
}

function hasPosition(baseAvail: number, baseMin: number): boolean {
  return baseAvail > baseMin * 1.01;
}

export async function runBot(): Promise<void> {
  const cfg = getConfig();
  const client = createCoinbaseClient();
  const { base: baseCur, quote: quoteCur } = parseProductId(cfg.PRODUCT_ID);

  const productInfo: Product | undefined = await client.rest.product.getProduct(cfg.PRODUCT_ID);
  if (!productInfo) {
    throw new Error(`Unknown product ${cfg.PRODUCT_ID}`);
  }

  const quoteMin = productInfo.quote_min_size;
  const baseMin = productInfo.base_min_size;

  logLine('Bot starting', {
    product: cfg.PRODUCT_ID,
    paper: cfg.PAPER_TRADING,
    granularity: cfg.CANDLE_GRANULARITY,
    strategy: 'EMA cross + EMA(trend) filter',
  });

  logLine(
    'Disclaimer: past performance does not guarantee results. You can lose capital. This is not financial advice.'
  );

  const stop = () => {
    logLine('Shutdown requested, exiting');
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  for (;;) {
    try {
      const candles = await client.rest.product.getCandles(cfg.PRODUCT_ID, {
        granularity: cfg.candleGranularity,
      });

      const highs = candles.map((c) => c.high);
      const lows = candles.map((c) => c.low);
      const closes = candles.map((c) => c.close);

      const ev = evaluateEmaCrossTrend(cfg, highs, lows, closes);
      const { baseAvail, quoteAvail } = await readBalances(client, baseCur, quoteCur);

      logLine('tick', {
        close: ev.lastClose.toFixed(2),
        signal: ev.signal,
        emaFast: Number.isFinite(ev.emaFast) ? ev.emaFast.toFixed(4) : 'n/a',
        emaSlow: Number.isFinite(ev.emaSlow) ? ev.emaSlow.toFixed(4) : 'n/a',
        emaTrend: Number.isFinite(ev.emaTrend) ? ev.emaTrend.toFixed(4) : 'n/a',
        atr: ev.atr ? ev.atr.toFixed(4) : 'n/a',
        inUptrend: ev.inUptrend,
        baseBal: baseAvail,
        quoteBal: quoteAvail.toFixed(2),
        reason: ev.reason,
      });

      const inPos = hasPosition(baseAvail, parseFloat(baseMin));

      if (ev.signal === 'BUY' && !inPos) {
        const riskUsd = quoteAvail * cfg.RISK_PER_TRADE;
        let spend = riskUsd;
        if (cfg.MAX_QUOTE_PER_ORDER !== undefined) {
          spend = Math.min(spend, cfg.MAX_QUOTE_PER_ORDER);
        }
        const quoteSize = toQuoteString(spend, quoteMin);
        if (!quoteSize) {
          logLine('skip BUY: quote size below minimum', { spend, quoteMin });
        } else if (cfg.PAPER_TRADING) {
          logLine('[PAPER] would BUY market', { quote_size: quoteSize, product_id: cfg.PRODUCT_ID });
        } else {
          const res = await client.rest.order.placeOrder({
            client_order_id: randomUUID(),
            product_id: cfg.PRODUCT_ID,
            side: OrderSide.BUY,
            order_configuration: {
              market_market_ioc: { quote_size: quoteSize },
            },
          });
          if (res.success) {
            logLine('BUY submitted', { order: res.success_response });
          } else {
            logLine('BUY rejected', { err: res.error_response });
          }
        }
      }

      if (ev.signal === 'SELL' && inPos) {
        const sellAmt = baseAvail * 0.999;
        const baseSize = toBaseString(sellAmt, baseMin);
        if (!baseSize) {
          logLine('skip SELL: amount size below minimum', { sellAmt, baseMin });
        } else if (cfg.PAPER_TRADING) {
          logLine('[PAPER] would SELL market', { amount_size: baseSize, product_id: cfg.PRODUCT_ID });
        } else {
          const res = await client.rest.order.placeOrder({
            client_order_id: randomUUID(),
            product_id: cfg.PRODUCT_ID,
            side: OrderSide.SELL,
            order_configuration: {
              market_market_ioc: { base_size: baseSize },
            },
          });
          if (res.success) {
            logLine('SELL submitted', { order: res.success_response });
          } else {
            logLine('SELL rejected', { err: res.error_response });
          }
        }
      }
    } catch (err) {
      logLine('loop error', { error: String(err) });
    }

    await new Promise((r) => setTimeout(r, cfg.POLL_MS));
  }
}
