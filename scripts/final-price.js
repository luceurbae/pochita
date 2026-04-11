import { chromium } from 'playwright';

function valueAfter(lines, label) {
  const idx = lines.findIndex(l => l.trim().toLowerCase() === label.toLowerCase());
  if (idx === -1) return '';
  const next = lines.slice(idx + 1, idx + 12).find(x => x.trim());
  return (next || '').trim();
}

function priceToBeatFrom(lines) {
  const idx = lines.findIndex(l => l.trim().toLowerCase() === 'price to beat');
  if (idx === -1) return '';
  const slice = lines.slice(idx + 1, idx + 10).join(' ');
  const m = slice.match(/\$[0-9,]+\.[0-9]+/);
  return m ? m[0] : valueAfter(lines, 'Price To Beat');
}

function finalPriceFrom(lines) {
  const idx = lines.findIndex(l => l.trim().toLowerCase() === 'final price');
  if (idx === -1) return '';
  const slice = lines.slice(idx + 1, idx + 60);
  const joined = slice.join(' ');
  const direct = joined.match(/\$[0-9,]+\.[0-9]+/g) || [];
  if (direct.length) return direct[direct.length - 1];
  const chars = [];
  for (const line of slice) {
    const t = line.trim();
    if (/Go to live market|market closed|Past|Ended:/i.test(t)) break;
    if (/^[0-9.,$]$/.test(t)) chars.push(t);
  }
  const rebuilt = chars.join('');
  const m = rebuilt.match(/\$?[0-9,]+\.[0-9]+/);
  if (m) return m[0].startsWith('$') ? m[0] : `$${m[0]}`;
  return valueAfter(lines, 'Final price');
}

function numericDollar(s) {
  const m = String(s || '').replace(/[^0-9.\-]/g, '');
  return m ? Number(m) : null;
}

const url = process.argv[2];
if (!url) {
  console.error('Usage: node final-price.js <market-url>');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1600 } });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
await page.mouse.wheel(0, 1400);
await page.waitForTimeout(2000);
const text = await page.locator('body').innerText();
const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
const title = lines.find(l => /^Bitcoin Up or Down/i.test(l)) || '';
const priceToBeat = priceToBeatFrom(lines);
const finalPrice = finalPriceFrom(lines);
const ptb = numericDollar(priceToBeat);
const fp = numericDollar(finalPrice);
let outcome = '';
if (ptb !== null && fp !== null) outcome = fp >= ptb ? 'UP' : 'DOWN';
console.log(JSON.stringify({ url, title, priceToBeat, finalPrice, outcome }, null, 2));
await browser.close();
