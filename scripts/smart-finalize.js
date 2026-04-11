import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKTEST_FILE = path.resolve('/home/zaluk/.openclaw/workspace/backtest.txt');

const url = process.argv[2];
if (!url) {
  console.error('Usage: node smart-finalize.js <market-url>');
  process.exit(1);
}

async function finalize() {
  console.log(`🔍 Finalizing: ${url}`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const content = await page.content();
    const match = content.match(/Outcome:\s*(Up|Down)/i);
    
    if (!match) {
      throw new Error('Outcome text not found on page');
    }
    
    const result = match[1].toUpperCase();
    console.log(`✅ Final Outcome for ${url}: ${result}`);
    
    if (fs.existsSync(BACKTEST_FILE)) {
      let content = fs.readFileSync(BACKTEST_FILE, 'utf8');
      const lines = content.split('\n');
      let updated = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(url) && lines[i].includes('PENDING') && lines[i].includes('|')) {
          const parts = lines[i].split('|');
          if (parts.length >= 5) {
             const prediction = parts[4].trim().toUpperCase();
             const finalStatus = (prediction === result) ? 'CORRECT' : 'WRONG';
             
             let cleanLine = lines[i].split(' :: 🔍')[0].split('💾')[0].trim();
             cleanLine = cleanLine.replace('PENDING', finalStatus);
             lines[i] = cleanLine + ` :: final=${result}`;
             
             updated = true;
             break;
          }
        }
      }
      
      if (updated) {
        fs.writeFileSync(BACKTEST_FILE, lines.join('\n'));
      }
    }
    
  } catch (e) {
    console.error('❌ Error finalizing:', e.message);
  } finally {
    await browser.close();
  }
}

finalize();
