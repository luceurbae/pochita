import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKTEST_FILE = path.join(__dirname, '../../backtest.txt');
const FINAL_FILE = path.join(__dirname, '../final-market.txt');

async function massFinalize() {
  console.log('🐶 Starting Mass Finalize...');
  
  // 1. Baca backtest.txt
  if (!fs.existsSync(BACKTEST_FILE)) {
    console.log('❌ backtest.txt not found.');
    return;
  }

  const content = fs.readFileSync(BACKTEST_FILE, 'utf8');
  const lines = content.split('\n');
  let updated = false;
  let results = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('PENDING') && line.includes('polymarket.com')) {
      // Extract URL
      const urlMatch = line.match(/https:\/\/polymarket.com\/event\/[^\s|]+/);
      if (urlMatch) {
        const url = urlMatch[0];
        console.log(`🔍 Finalizing: ${url}...`);
        
        try {
          const result = execSync(`node ${path.join(__dirname, 'smart-finalize.js')} ${url}`, { encoding: 'utf8' });
          const outcomeMatch = result.match(/Final Outcome.*: (UP|DOWN)/);
          
          if (outcomeMatch) {
            const outcome = outcomeMatch[1];
            // Update line in memory
            lines[i] = line.replace('PENDING', outcome === line.split('|')[4].trim() ? 'CORRECT' : 'WRONG') + ` :: final=${outcome}`;
            results.push(`${url} | Outcome: ${outcome}`);
            updated = true;
          }
        } catch (e) {
          console.error(`Error with ${url}`);
        }
        
        // Jeda biar aman
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  }

  // 2. Save updates
  if (updated) {
    fs.writeFileSync(BACKTEST_FILE, lines.join('\n'));
    console.log('✅ backtest.txt updated!');
  }

  // 3. Save to final-market.txt
  if (results.length > 0) {
    const header = `# Finalized Markets Report - ${new Date().toISOString()}\n`;
    fs.appendFileSync(FINAL_FILE, header + results.join('\n') + '\n\n');
    console.log(`💾 Saved ${results.length} results to final-market.txt`);
  } else {
    console.log('⏭️  No pending markets found.');
  }
}

massFinalize();
