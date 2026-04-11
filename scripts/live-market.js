import { chromium } from 'playwright';

const url = process.argv[2];
if (!url) {
  console.error('Usage: node live-market.js <market-url>');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);

const candidates = [
  'text=Go to live market',
  'button:has-text("Go to live market")',
  '[role="button"]:has-text("Go to live market")',
  'a:has-text("Go to live market")'
];

let clicked = false;
for (const sel of candidates) {
  const loc = page.locator(sel).first();
  if (await loc.count()) {
    await loc.click({ timeout: 5000 }).catch(() => null);
    clicked = true;
    break;
  }
}

await page.waitForTimeout(4000);
console.log(JSON.stringify({ initialUrl: url, clicked, finalUrl: page.url() }, null, 2));
await browser.close();
