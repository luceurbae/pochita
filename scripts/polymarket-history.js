/**
 * polymarket-history.js
 * Fetch Polymarket price history for a 5-min market
 * 
 * Market slug format: btc-updown-5m-{unix_timestamp}
 * API: https://polymarket.com/api/crypto/price-history?symbol=BTC&eventStartTime=...&variant=fiveminute&endDate=...
 * 
 * Returns: { open, high, low, close, priceSeries, direction, changePct }
 */

import https from 'https';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({ rejectUnauthorized: false });
    https.get(url, { agent }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Parse error: ' + data.substring(0, 200))); }
      });
    }).on('error', reject);
  });
}

/**
 * Get price history from Polymarket for a specific market window
 */
export async function getPolymarketHistory(symbol = 'BTC', eventStartTime, endDate) {
  if (!eventStartTime || !endDate) return null;
  
  const url = `https://polymarket.com/api/crypto/price-history?symbol=${symbol}&eventStartTime=${encodeURIComponent(eventStartTime)}&variant=fiveminute&endDate=${encodeURIComponent(endDate)}`;
  
  try {
    const data = await fetchUrl(url);
    
    if (!Array.isArray(data) || data.length === 0) return null;
    
    const prices = data.map(d => d.value);
    const open = prices[0];
    const close = prices[prices.length - 1];
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    
    const change = close - open;
    const changePct = open > 0 ? (change / open) * 100 : 0;
    const direction = change > 0.01 ? 'UP' : change < -0.01 ? 'DOWN' : 'NEUTRAL';
    
    // Trend strength: how many minutes moved up vs down
    let upCount = 0, downCount = 0;
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > prices[i-1]) upCount++;
      else if (prices[i] < prices[i-1]) downCount++;
    }
    
    // Average minute-by-minute move
    let totalMove = 0;
    for (let i = 1; i < prices.length; i++) {
      totalMove += Math.abs(prices[i] - prices[i-1]);
    }
    const avgMove = totalMove / Math.max(prices.length - 1, 1);
    
    return {
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      change: +change.toFixed(2),
      changePct: +changePct.toFixed(4),
      direction,
      avgMove: +avgMove.toFixed(2),
      upCount,
      downCount,
      priceSeries: prices.map(p => +p.toFixed(2)),
      dataPoints: data.length,
    };
  } catch (e) {
    console.error('[PolymarketHistory] Error:', e.message);
    return null;
  }
}

/**
 * Parse market slug to extract timestamps
 * Format: btc-updown-5m-{unix_timestamp_seconds}
 */
export function parseMarketSlug(slug) {
  if (!slug) return null;
  const parts = slug.split('-');
  const timestampSec = parseInt(parts[parts.length - 1], 10);
  if (isNaN(timestampSec)) return null;
  
  const startMs = timestampSec * 1000;
  const startDate = new Date(startMs);
  const endDate = new Date(startMs + 5 * 60 * 1000);
  
  return {
    timestamp: timestampSec,
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString(),
  };
}

// CLI test
if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2] || 'btc-updown-5m-1776144600';
  const parsed = parseMarketSlug(slug);
  console.log('Parsed:', parsed);
  if (parsed) {
    getPolymarketHistory('BTC', parsed.startTime, parsed.endTime).then(data => {
      console.log('Result:', JSON.stringify(data, null, 2));
    }).catch(console.error);
  }
}
