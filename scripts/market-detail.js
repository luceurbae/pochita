import { chromium } from 'playwright';

function valueAfter(lines, label) {
  const idx = lines.findIndex(l => l.trim() === label);
  if (idx === -1) return '';
  const next = lines.slice(idx + 1, idx + 8).find(x => x.trim());
  return (next || '').trim();
}

function currentPriceAfter(lines) {
  const idx = lines.findIndex(l => l.trim() === 'Current Price');
  if (idx === -1) return '';
  const chunk = [];
  for (const line of lines.slice(idx + 1, idx + 40)) {
    if (/MINS|SECS|market closed|Past/i.test(line)) break;
    chunk.push(line.trim());
  }
  const joined = chunk.join('');
  const m = joined.match(/[0-9]{2,}\.?[0-9]*/);
  return m ? `$${m[0]}` : '';
}

const url = process.argv[2];
if (!url) {
  console.error('Usage: node market-detail.js <market-url>');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1800 } });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
await page.mouse.wheel(0, 1200);
await page.waitForTimeout(2000);
const text = await page.locator('body').innerText();
const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
const title = lines.find(l => /^Bitcoin Up or Down/i.test(l)) || '';
const timeRange = lines.find(l => /ET$/i.test(l)) || '';
const priceToBeat = valueAfter(lines, 'Price To Beat');
const currentPrice = currentPriceAfter(lines);
const vol = lines.find(l => /Vol\./i.test(l)) || '';
const marketClosed = lines.some(l => /market closed/i.test(l));
console.log(JSON.stringify({ url, title, timeRange, priceToBeat, currentPrice, vol, marketClosed }, null, 2));
await browser.close();
