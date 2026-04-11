import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const targetUrl = process.argv[2];
if (!targetUrl) {
  console.error('Usage: node update-from-final.js <market-url>');
  process.exit(1);
}

const file = path.resolve('./backtest.txt');
const here = path.dirname(new URL(import.meta.url).pathname);
const finalScript = path.join(here, 'final-price.js');
const raw = execFileSync('node', [finalScript, targetUrl], { encoding: 'utf8' });
const finalData = JSON.parse(raw);

if (!finalData.outcome) {
  console.error('No final outcome parsed from market page.');
  process.exit(2);
}

const lines = fs.readFileSync(file, 'utf8').split('\n');
let updated = false;
const out = lines.map((line) => {
  if (!line || line.startsWith('#')) return line;
  const parts = line.split(' | ');
  const urlField = (parts[8] || '').split(' :: ')[0].trim();
  if (urlField !== targetUrl) return line;

  const prediction = (parts[5] || '').trim().toUpperCase();
  const result = prediction && prediction === finalData.outcome.toUpperCase() ? 'CORRECT' : 'WRONG';
  parts[7] = result;
  parts[8] = `${targetUrl} :: final=${finalData.outcome}; finalPrice=${finalData.finalPrice}; priceToBeat=${finalData.priceToBeat}`;
  updated = true;
  return parts.join(' | ');
});

if (!updated) {
  console.error('No matching URL found in backtest.txt');
  process.exit(3);
}

fs.writeFileSync(file, out.join('\n'));
console.log(JSON.stringify({ updated: true, url: targetUrl, finalOutcome: finalData.outcome, finalPrice: finalData.finalPrice, priceToBeat: finalData.priceToBeat }, null, 2));
