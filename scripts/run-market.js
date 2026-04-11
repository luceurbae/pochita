import { execFileSync } from 'child_process';
import path from 'path';

const inputUrl = process.argv[2];
const mode = process.argv[3] || 'predict'; // predict | finalize
if (!inputUrl) {
  console.error('Usage: node run-market.js <market-url> [predict|finalize]');
  process.exit(1);
}

function runNode(script, args = []) {
  return execFileSync('node', [script, ...args], { encoding: 'utf8' }).trim();
}

const here = path.dirname(new URL(import.meta.url).pathname);
const liveScript = path.join(here, 'live-market.js');
const logPredictScript = path.join(here, 'log-predict.js');
const updateFinalScript = path.join(here, 'update-from-final.js');

let liveUrl = inputUrl;
try {
  const liveRaw = runNode(liveScript, [inputUrl]);
  const liveData = JSON.parse(liveRaw);
  if (liveData.finalUrl) liveUrl = liveData.finalUrl;
} catch (e) {
  // fallback: use input url directly
}

if (mode === 'finalize') {
  const result = runNode(updateFinalScript, [liveUrl]);
  console.log(result);
} else {
  const result = runNode(logPredictScript, [liveUrl]);
  console.log(result);
}
