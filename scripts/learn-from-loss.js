import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MEMORY_FILE = path.join(__dirname, '../strategy_memory.md');

const url = process.argv[2];
const prediction = process.argv[3]; // UP or DOWN
const outcome = process.argv[4]; // UP or DOWN (Final Result)
const diff = process.argv[5];
const momentum = process.argv[6];

if (outcome === prediction) {
  console.log('✅ Trade Correct! No new lesson needed.');
  process.exit(0);
}

console.log('❌ Trade Wrong! Pochita is learning...');

const today = new Date().toISOString().split('T')[0];
const lesson = `
### ${today} - Market: ${url}
- **Prediction:** ${prediction}
- **Outcome:** ${outcome}
- **Conditions:** Diff: ${diff}, Momentum: ${momentum}
- **Analysis:** Pochita predicted ${prediction} but result was ${outcome}. 
- **Adjustment:** In future trades with similar diff (${diff}) and momentum, consider the opposite or wait for stronger confirmation.

`;

fs.appendFileSync(MEMORY_FILE, lesson);
console.log('💾 New lesson saved to strategy_memory.md');

// Update juga di Jurnal AI biar bos bisa baca
const learningLog = `[${new Date().toISOString()}] | ${url} | ${prediction} -> ${outcome} | LESSON: Pochita realized that with diff ${diff} and momentum ${momentum}, the prediction was wrong. Adjusting future strategy.
`;
fs.appendFileSync(path.join(__dirname, '../ai-reasoning.txt'), learningLog);
