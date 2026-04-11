import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const here = path.dirname(new URL(import.meta.url).pathname);
const runMarketScript = path.join(here, 'run-market.js');
const stateFile = path.join(here, 'rolling-state.json');

// Load state
let state = { pending: [], lastTimestamp: 0 };
if (fs.existsSync(stateFile)) {
  try {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch (e) { console.error('State file corrupted, resetting.'); }
}

function runNode(script, args = []) {
  try {
    return execFileSync('node', [script, ...args], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    return e.stdout + e.stderr;
  }
}

// 1. Generate Next Market URL (Based on current time or last known)
// For simplicity in this script, we expect the URL to be passed or we calculate next 5m slot
// But to keep it simple for chat usage, let's assume we process a specific URL passed as arg 2
// OR we auto-detect. For now, let's stick to the user providing the URL or we just process the "Next" logic.

// Actually, to make it "Auto", we need to know the current Live Market URL.
// Let's assume the user runs: node rolling-backtest.js <current-live-url>

const currentUrl = process.argv[2];
if (!currentUrl) {
  console.error('Usage: node rolling-backtest.js <current-live-market-url>');
  process.exit(1);
}

const now = Date.now();
const TEN_MINUTES = 10 * 60 * 1000;

// 2. Predict Current Market
console.log(`\n🔍 PREDICTING: ${currentUrl}`);
const predictResult = runNode(runMarketScript, [currentUrl, 'predict']);
console.log(predictResult);

// Add to pending list with timestamp
state.pending.push({ url: currentUrl, predictedAt: now });

// 3. Finalize Old Markets (Older than 10 mins)
const toFinalize = state.pending.filter(p => (now - p.predictedAt) >= TEN_MINUTES);
const stillPending = state.pending.filter(p => (now - p.predictedAt) < TEN_MINUTES);

if (toFinalize.length > 0) {
  console.log(`\n⏳ FINALIZING ${toFinalize.length} OLD MARKETS...`);
  for (const item of toFinalize) {
    console.log(`➡️ Finalizing: ${item.url}`);
    const finalResult = runNode(runMarketScript, [item.url, 'finalize']);
    console.log(finalResult);
  }
}

// 4. Update State
state.pending = stillPending;
fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

console.log(`\n✅ Cycle Complete. Pending Finalizations: ${stillPending.length}`);
