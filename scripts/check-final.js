import fs from 'fs';
import path from 'path';

const targetUrl = process.argv[2] || '';
const file = path.resolve('./backtest.txt');
const lines = fs.readFileSync(file, 'utf8').split('\n');

function slugFromUrl(url) {
  const m = String(url).match(/\/event\/([^\s:]+)/);
  return m ? m[1] : '';
}

async function fetchFinalOutcome(slug) {
  const res = await fetch(`https://gamma-api.polymarket.com/markets?slug=${slug}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Gamma API error ${res.status}`);
  const arr = await res.json();
  if (!arr.length) throw new Error('No market found for slug');
  const market = arr[0];
  const prices = JSON.parse(market.outcomePrices || '[]');
  const outcomes = JSON.parse(market.outcomes || '[]');
  let finalOutcome = '';
  const idx = prices.findIndex(p => String(p) === '1' || Number(p) === 1);
  if (idx >= 0) finalOutcome = outcomes[idx] || '';
  return { closed: market.closed, active: market.active, finalOutcome, market };
}

const out = [];
for (const line of lines) {
  if (!line || line.startsWith('#')) { out.push(line); continue; }
  const parts = line.split(' | ');
  const urlField = (parts[8] || '').split(' :: ')[0].trim();
  if (!urlField.includes('/event/')) { out.push(line); continue; }
  if (targetUrl && urlField !== targetUrl) { out.push(line); continue; }

  try {
    const slug = slugFromUrl(urlField);
    const { closed, finalOutcome } = await fetchFinalOutcome(slug);
    if (!closed || !finalOutcome) { out.push(line); continue; }
    const prediction = (parts[5] || '').trim().toUpperCase();
    let result = 'PENDING';
    if (prediction) {
      result = prediction === finalOutcome.toUpperCase() ? 'CORRECT' : 'WRONG';
    }
    parts[7] = result;
    parts[8] = `${urlField} :: final=${finalOutcome}`;
    out.push(parts.join(' | '));
    console.log(`Updated ${slug} => ${result} (${finalOutcome})`);
  } catch (e) {
    out.push(line);
    console.error(`Skip line: ${e.message}`);
  }
}
fs.writeFileSync(file, out.join('\n'));
