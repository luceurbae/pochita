import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REASONING_FILE = path.join(__dirname, '../ai-reasoning.txt');
const OUTPUT_FILE = path.join(__dirname, '../../finalize-qwen-inst.txt');
const START_TIMESTAMP = '[2026-04-05T15:47:53.725Z]';

console.log('🐶 Starting Finalize from Reasoning...');

// 1. Baca file reasoning
const content = fs.readFileSync(REASONING_FILE, 'utf8');
const lines = content.split('\n');

// 2. Cari index awal
let startIndex = lines.findIndex(line => line.includes(START_TIMESTAMP));
if (startIndex === -1) startIndex = 0;
console.log(`✅ Starting from line: ${startIndex + 1}`);

// 3. Launch Browser
const browser = await chromium.launch({ headless: true });

// 4. Proses satu per satu
for (let i = startIndex; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const parts = line.split(' | ');
  if (parts.length < 3) continue;
  
  const url = parts[1].trim();
  const prediction = parts[2].trim(); // UP/DOWN/SKIP
  
  console.log(`[${i+1}/${lines.length}] 🔍 Processing: ${prediction} for ${url}`);

  if (prediction === 'SKIP') {
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
console.log('✅ Finalize from Reasoning Complete!');
console.log(`📄 Check results at: ${OUTPUT_FILE}`);
