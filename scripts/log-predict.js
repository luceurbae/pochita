import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const url = process.argv[2];
if (!url) {
  console.error('Usage: node log-predict.js <market-url>');
  process.exit(1);
}

const here = path.dirname(new URL(import.meta.url).pathname);
const predictScript = path.join(here, 'predict.js');
const outFile = path.resolve('./backtest.txt');
const raw = execFileSync('node', [predictScript, url], { encoding: 'utf8' });
const data = JSON.parse(raw);
const now = new Date().toISOString();
const line = `${now} | ${data.title} | ${data.timeRange} | ${data.priceToBeat} | ${data.currentPrice} | ${data.prediction} | ${data.confidence} | PENDING | ${data.url} :: ${data.reason}`;
fs.appendFileSync(outFile, line + '\n');
console.log(line);
