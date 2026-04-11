import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const url = process.argv[2];
if (!url) {
  console.error('Usage: node log-direct.js <market-url>');
  process.exit(1);
}

const here = path.dirname(new URL(import.meta.url).pathname);
const detailScript = path.join(here, 'market-detail.js');
const outFile = path.resolve('./backtest.txt');
const raw = execFileSync('node', [detailScript, url], { encoding: 'utf8' });
const data = JSON.parse(raw);
const now = new Date().toISOString();
const line = `${now} | ${data.title} | ${data.timeRange} | ${data.priceToBeat} | ${data.vol} |  |  | PENDING | ${data.url}`;
fs.appendFileSync(outFile, line + '\n');
console.log(line);
