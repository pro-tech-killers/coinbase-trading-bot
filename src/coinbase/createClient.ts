import { Coinbase } from 'coinbase-advanced-node';

export function createCoinbaseClient(): Coinbase {
  const cdpName = process.env.CDP_API_KEY_NAME?.trim();
  const cdpSecret = process.env.CDP_API_KEY_SECRET?.trim();
  const legKey = process.env.API_KEY?.trim();
  const legSec = process.env.API_SECRET?.trim();

  if (cdpName && cdpSecret) {
    return new Coinbase({
      cloudApiKeyName: cdpName,
      cloudApiSecret: cdpSecret,
    });
  }
  if (legKey && legSec) {
    return new Coinbase({ apiKey: legKey, apiSecret: legSec });
  }
  throw new Error(
    'Set CDP API keys (CDP_API_KEY_NAME + CDP_API_KEY_SECRET) or legacy keys (API_KEY + API_SECRET). See .env.example.'
  );
}
