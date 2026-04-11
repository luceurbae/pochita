import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REASONING_FILE = path.join(__dirname, '../ai-reasoning.txt');
const OUTPUT_FILE = path.join(__dirname, '../../finalize-qwen-inst.txt');
const START_TIMESTAMP = '[2026-04-09T15:34:06.778Z]';

console.log('🐶 Starting Finalize V2...');

// 1. Pastikan file output ada (biar tail -f bisa jalan)
if (!fs.existsSync(OUTPUT_FILE)) {
    fs.writeFileSync(OUTPUT_FILE, '🐶 Pochita Finalize Log - Qwen 2.5 72B\n');
}

// 2. Baca file reasoning
const content = fs.readFileSync(REASONING_FILE, 'utf8');
const lines = content.split('\n');

// 3. Cari index awal
let startIndex = lines.findIndex(line => line.includes(START_TIMESTAMP));
if (startIndex === -1) startIndex = 0;

console.log(`✅ Starting from line: ${startIndex + 1} to ${lines.length}`);

// 4. Launch Browser
const browser = await chromium.launch({ headless: true });

let correctCount = 0;
let wrongCount = 0;
let skipCount = 0;

// 5. Proses satu per satu
for (let i = startIndex; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const parts = line.split(' | ');
  if (parts.length < 3) continue;
  
  const url = parts[1].trim();
  const prediction = parts[2].trim(); // UP/DOWN/SKIP
  
  console.log(`[${i+1}/${lines.length}] 🔍 Processing: ${prediction} for ${url}`);

  if (prediction === 'SKIP') {
    skipCount++;
    fs.appendFileSync(OUTPUT_FILE, `SKIP | ${url}\n`);
    continue;
  }

  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);
    
    const pageContent = await page.content();
    const match = pageContent.match(/Outcome:\s*(Up|Down)/i);
    
    if (match) {
      const actualResult = match[1].toUpperCase();
      const isCorrect = (prediction === actualResult) ? 'CORRECT' : 'WRONG';
      
      if (isCorrect === 'CORRECT') correctCount++;
      else wrongCount++;

      const logEntry = `${prediction} | ${actualResult} | ${isCorrect} | ${url}`;
      fs.appendFileSync(OUTPUT_FILE, logEntry + '\n');
      console.log(`   ✅ Result: ${actualResult} -> ${isCorrect}`);
    } else {
      console.log(`   ⚠️ Outcome not found.`);
      fs.appendFileSync(OUTPUT_FILE, `PENDING_CHECK | ${url}\n`);
    }
  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`);
    fs.appendFileSync(OUTPUT_FILE, `ERROR | ${url}\n`);
  } finally {
    await page.close();
  }
}

await browser.close();

// 6. Laporan Akhir
const totalTrades = correctCount + wrongCount;
const winRate = totalTrades > 0 ? ((correctCount / totalTrades) * 100).toFixed(2) : 0;

const summary = `\n--- FINAL REPORT QWEN 2.5 72B ---\nTotal Trades: ${totalTrades}\nCorrect: ${correctCount}\nWrong: ${wrongCount}\nSkipped: ${skipCount}\nWin Rate: ${winRate}%\n----------------------------`;
fs.appendFileSync(OUTPUT_FILE, summary);
console.log(summary);
console.log(`📄 Full report at: ${OUTPUT_FILE}`);
