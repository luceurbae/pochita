import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REASONING_FILE = path.join(__dirname, '../ai-reasoning.txt');
const OUTPUT_FILE = path.join(__dirname, '../../finalize-qwen-inst.txt');
const START_TIMESTAMP = '[2026-04-05T15:47:53.725Z]';

console.log('🐶 Starting Smart Finalize (Range Mode)...');

// 1. Baca file reasoning
const content = fs.readFileSync(REASONING_FILE, 'utf8');
const lines = content.split('\n');

// 2. Cari index awal
let startIndex = lines.findIndex(line => line.includes(START_TIMESTAMP));
if (startIndex === -1) {
  startIndex = 0;
  console.log('⚠️ Start timestamp not found, starting from beginning.');
} else {
  console.log(`✅ Starting from line: ${startIndex + 1}`);
}

// 3. Proses satu per satu
for (let i = startIndex; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  // Extract URL and Prediction
  const parts = line.split(' | ');
  if (parts.length < 3) continue;
  
  const url = parts[1].trim();
  const prediction = parts[2].trim(); // UP/DOWN/SKIP
  
  if (prediction === 'SKIP') {
    fs.appendFileSync(OUTPUT_FILE, `SKIP | ${url}\n`);
    continue; 
  }

  console.log(`🔍 Finalizing: ${url} (Prediksi: ${prediction})...`);

  try {
    // Panggil smart-finalize.js
    const output = execSync(`node ${path.join(__dirname, 'smart-finalize.js')} "${url}" "${prediction}"`, { encoding: 'utf8' });
    
    // Ambil hasil dari output smart-finalize (baris yang ada "Final Outcome")
    const resultLine = output.split('\n').find(l => l.includes('Final Outcome'));
    if (resultLine) {
      fs.appendFileSync(OUTPUT_FILE, `${resultLine.trim()}\n`);
    }
  } catch (e) {
    console.error(`❌ Error processing ${url}:`, e.message);
    fs.appendFileSync(OUTPUT_FILE, `ERROR | ${url}\n`);
  }
}

console.log('✅ Smart Finalize Range Complete!');
console.log(`📄 Results saved in: ${OUTPUT_FILE}`);
