import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REASONING_FILE = path.join(__dirname, '../ai-reasoning.txt');

async function runBatch() {
  // 1. Ambil semua URL dan Prediksi dari ai-reasoning.txt
  const content = fs.readFileSync(REASONING_FILE, 'utf8');
  const lines = content.split('\n').filter(l => l.includes('|') && !l.startsWith('#'));

  let total = 0;
  let wins = 0;
  let losses = 0;

  console.log(`🐶 Starting Batch Finalize for ${lines.length} markets...`);

  for (const line of lines) {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 4) continue;

    const url = parts[1];
    const prediction = parts[2];
    
    try {
      const result = execSync(`node ${path.join(__dirname, 'smart-finalize.js')} ${url}`, { encoding: 'utf8' });
      const outcomeMatch = result.match(/Final Outcome.*: (UP|DOWN)/);
      
      if (outcomeMatch) {
        const outcome = outcomeMatch[1];
        total++;
        if (outcome === prediction) {
          wins++;
          console.log(`✅ WIN | Pred: ${prediction} | Out: ${outcome}`);
        } else {
          losses++;
          console.log(`❌ LOSS | Pred: ${prediction} | Out: ${outcome}`);
        }
      }
    } catch (e) {
      console.error(`Error processing ${url}`);
    }
    
    // Jeda 1 detik
    await new Promise(r => setTimeout(r, 1000));
  }

  const winRate = total > 0 ? ((wins / total) * 100).toFixed(2) : 0;
  console.log(`\n🏆 FINAL REPORT:`);
  console.log(`Total: ${total}`);
  console.log(`Wins: ${wins}`);
  console.log(`Losses: ${losses}`);
  console.log(`WIN RATE: ${winRate}%`);
}

runBatch();
