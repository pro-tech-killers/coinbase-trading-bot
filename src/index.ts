import 'dotenv/config';
import { getConfig } from './config.js';
import { runBot } from './engine/botEngine.js';

getConfig();
runBot().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
