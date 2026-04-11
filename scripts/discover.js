async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function pickMarketTitle(obj) {
  return obj.title || obj.question || obj.slug || '';
}

function normalizeTitle(s) {
  return String(s || '').toLowerCase();
}

function isBtc5mCandidate(title) {
  const t = normalizeTitle(title);
  return (
    (t.includes('bitcoin up or down') || t.includes('btc up or down') || t.includes('bitcoin')) &&
    (t.includes('5 minute') || t.includes('5 minutes') || t.includes('5m') || t.includes('up or down'))
  );
}

async function main() {
  const markets = await fetchJson('https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=500');
  const out = [];
  for (const market of markets) {
    const title = pickMarketTitle(market);
    if (!isBtc5mCandidate(title)) continue;
    const slug = market.slug || '';
    const eventUrl = slug ? `https://polymarket.com/event/${slug}` : '';
    out.push({
      id: market.id,
      title,
      slug,
      url: eventUrl,
      active: market.active,
      closed: market.closed,
      yesPrice: market.outcomePrices?.[0] ?? null,
      noPrice: market.outcomePrices?.[1] ?? null,
      volume: market.volume ?? null
    });
  }
  console.log(JSON.stringify(out, null, 2));
}

await main();
