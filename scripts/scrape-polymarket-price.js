/**
 * scrape-polymarket-price.js
 * Pochita v2 - Real-time price scraper from Polymarket
 * Monitors live price movement for position management
 */

import https from 'https';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Parse market URL to get token ID and market info
 * URL: https://polymarket.com/event/btc-updown-5m-{timestamp}
 */
function parseMarketUrl(marketUrl) {
  try {
    const url = new URL(marketUrl);
    const pathParts = url.pathname.split('/');
    const eventSlug = pathParts[pathParts.length - 1];
    
    // Extract timestamp from slug
    const match = eventSlug.match(/btc-updown-5m-(\d+)/);
    if (!match) return null;
    
    const timestamp = parseInt(match[1]);
    const startTime = new Date(timestamp * 1000).toISOString();
    const endTime = new Date((timestamp + 300) * 1000).toISOString(); // 5 min later
    
    return {
      eventSlug,
      timestamp,
      startTime,
      endTime
    };
  } catch (e) {
    return null;
  }
}

/**
 * Get current prices from Polymarket API
 * Returns both UP and DOWN prices
 */
async function getMarketPrices(eventSlug) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'clob.polymarket.com',
      path: `/markets?event_slug=${eventSlug}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };
    
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json && json.length > 0) {
            const market = json[0];
            const outcomes = market.outcomes || [];
            const upPrice = outcomes.find(o => o.toLowerCase() === 'up')?.price || null;
            const downPrice = outcomes.find(o => o.toLowerCase() === 'down')?.price || null;
            
            resolve({
              marketUrl: market.url || null,
              upPrice: upPrice ? parseFloat(upPrice) : null,
              downPrice: downPrice ? parseFloat(downPrice) : null,
              volume: market.volume || 0,
              liquidity: market.liquidity || 0,
              closed: market.closed || false
            });
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

/**
 * Get price history for the market (last 5 minutes)
 */
async function getPriceHistory(timestamp) {
  const startTime = new Date(timestamp * 1000).toISOString();
  const endTime = new Date((timestamp + 300) * 1000).toISOString();
  
  const url = `https://polymarket.com/api/crypto/price-history?symbol=BTC&eventStartTime=${encodeURIComponent(startTime)}&variant=fiveminute&endDate=${encodeURIComponent(endTime)}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }
    
    const prices = data.map(x => x.value);
    return {
      open: prices[0],
      current: prices[prices.length - 1],
      high: Math.max(...prices),
      low: Math.min(...prices),
      change: prices[prices.length - 1] - prices[0],
      priceSeries: prices
    };
  } catch (e) {
    return null;
  }
}

/**
 * Main function - get full market data
 */
async function main(marketUrl) {
  if (!marketUrl) {
    console.error('Usage: node scrape-polymarket-price.js <market-url>');
    process.exit(1);
  }
  
  const parsed = parseMarketUrl(marketUrl);
  if (!parsed) {
    console.error('Invalid market URL');
    process.exit(1);
  }
  
  // Get current prices
  const prices = await getMarketPrices(parsed.eventSlug);
  
  // Get price history
  const history = await getPriceHistory(parsed.timestamp);
  
  // Get current BTC price for reference
  let btcPrice = 0;
  try {
    const btcRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    const btcData = await btcRes.json();
    btcPrice = parseFloat(btcData.price);
  } catch (e) {
    // ignore
  }
  
  console.log(JSON.stringify({
    marketUrl,
    eventSlug: parsed.eventSlug,
    timestamp: parsed.timestamp,
    startTime: parsed.startTime,
    currentPrices: prices,
    priceHistory: history,
    btcPrice,
    analysis: {
      recommendation: prices && prices.upPrice && prices.downPrice 
        ? (prices.upPrice > prices.downPrice ? 'More likely UP' : 'More likely DOWN')
        : 'Insufficient data',
      priceToBeat: prices?.upPrice 
        ? `$${prices.upPrice.toFixed(2)} (UP side)`
        : 'N/A',
      liquidity: prices?.liquidity || 0,
      volume: prices?.volume || 0
    }
  }, null, 2));
}

const marketUrl = process.argv[2];
main(marketUrl).catch(console.error);