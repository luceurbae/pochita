import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const OUT = path.resolve('./backtest.txt');
const SEARCH_URL = 'https://polymarket.com/search?q=bitcoin%20up%20or%20down';

function appendLine(line) {
  fs.appendFileSync(OUT, line + '\n');
}

function safe(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

function summarize() {
  const text = fs.readFileSync(OUT, 'utf8');
  const lines = text.split('\n').filter(l => l && !l.startsWith('#'));
  let correct = 0, wrong = 0, pending = 0;
  for (const line of lines) {
    const parts = line.split(' | ');
    const result = (parts[7] || '').trim().toUpperCase();
    if (result === 'CORRECT') correct++;
    else if (result === 'WRONG') wrong++;
    else pending++;
  }
  const totalDone = correct + wrong;
  const winRate = totalDone ? ((correct / totalDone) * 100).toFixed(2) : '0.00';
  console.log(`Correct: ${correct}`);
  console.log(`Wrong: ${wrong}`);
  console.log(`Pending: ${pending}`);
  console.log(`Win rate: ${winRate}%`);
}

async function extractCards(page) {
  await page.mouse.wheel(0, 2500);
  await page.waitForTimeout(2500);

  const anchors = await page.locator('a[href*="/event/"], a[href*="/market/"]').evaluateAll((els) => {
    return els.map((el) => ({
      href: el.href,
      text: (el.innerText || '').replace(/\s+/g, ' ').trim()
    })).filter(x => x.text);
  });

  const anchorMap = new Map();
  for (const a of anchors) {
    if (!/Bitcoin Up or Down/i.test(a.text)) continue;
    const key = a.text.toLowerCase();
    if (!anchorMap.has(key)) anchorMap.set(key, a.href);
  }

  const bodyText = await page.locator('body').innerText();
  const lines = bodyText.split('\n').map(s => s.trim()).filter(Boolean);
  const filtered = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/^Bitcoin Up or Down/i.test(line)) continue;
    if (/results for bitcoin up or down/i.test(line)) continue;
    if (/on April/i.test(line) && !/-/.test(line)) continue;

    const nearbyLines = lines.slice(i, i + 10);
    const nearby = nearbyLines.join(' | ');
    const volMatch = nearby.match(/\$[0-9.,]+\s*Vol\./i);
    const liqMatch = nearby.match(/\$[0-9.,]+\s*Liq\./i);
    const oddsMatch = nearby.match(/(\d+%)\s*Up/i);
    const hasTimeRange = /\b\d{1,2}:?\d{0,2}(AM|PM)\b.*ET/i.test(line) || /-/.test(line);
    if (!hasTimeRange) continue;

    const title = safe(line);
    const directUrl = anchorMap.get(title.toLowerCase()) || SEARCH_URL;

    filtered.push({
      title,
      url: directUrl,
      vol: safe(volMatch ? volMatch[0] : ''),
      liq: safe(liqMatch ? liqMatch[0] : ''),
      odds: oddsMatch ? `${oddsMatch[1]} Up` : '',
      raw: nearby
    });
  }

  const dedup = [];
  const seen = new Set();
  for (const f of filtered) {
    const key = `${f.title.toLowerCase()}|${f.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(f);
  }
  return dedup;
}

async function scrapeOnce() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1800 } });
  await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(7000);

  const cards = await extractCards(page);
  const now = new Date().toISOString();

  if (!cards.length) {
    console.log('No BTC up/down cards found.');
    await browser.close();
    return;
  }

  console.log(`Found ${cards.length} BTC up/down entries`);
  for (const c of cards.slice(0, 10)) {
    const line = `${now} | ${c.title} | ${c.odds} | ${c.vol} | ${c.liq} |  |  | PENDING | ${c.url}`;
    appendLine(line);
    console.log(line);
  }

  await browser.close();
}

async function watchLoop() {
  while (true) {
    try {
      await scrapeOnce();
    } catch (e) {
      console.error('watch error:', e.message);
    }
    await new Promise(r => setTimeout(r, 60000));
  }
}

const mode = process.argv[2] || 'once';
if (mode === 'summary') summarize();
else if (mode === 'watch') await watchLoop();
else await scrapeOnce();
