import { execFileSync } from 'child_process';
import path from 'path';

const url = process.argv[2];
if (!url) {
  console.error('Usage: node predict.js <market-url>');
  process.exit(1);
}

const here = path.dirname(new URL(import.meta.url).pathname);
const detailScript = path.join(here, 'market-detail.js');
const raw = execFileSync('node', [detailScript, url], { encoding: 'utf8' });
const data = JSON.parse(raw);

function parseDollar(v) {
  const m = String(v || '').replace(/[^0-9.\-]/g, '');
  return m ? Number(m) : null;
}

async function getBinancePrice() {
  const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
  if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
  const json = await res.json();
  return Number(json.price);
}

async function samplePrices(count = 10, delayMs = 200) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push(await getBinancePrice());
    if (i < count - 1) await new Promise(r => setTimeout(r, delayMs));
  }
  return arr;
}

function analyzeTrend(prices) {
  let upCount = 0;
  let downCount = 0;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i-1]) upCount++;
    else if (prices[i] < prices[i-1]) downCount++;
  }
  if (upCount > downCount + 2) return 1; // Strong Up
  if (downCount > upCount + 2) return -1; // Strong Down
  return 0; // Neutral/Choppy
}

const priceToBeat = parseDollar(data.priceToBeat);
const prices = await samplePrices();
const currentPrice = prices[prices.length - 1];
const firstPrice = prices[0];
const momentumDelta = currentPrice - firstPrice;
const diff = priceToBeat !== null ? currentPrice - priceToBeat : null;
const trendSignal = analyzeTrend(prices); // New: Trend analysis from Binance

let prediction = 'UNSET';
let confidence = 'low';
let reason = 'Insufficient parsed data';
let score = 0;
let noTrade = false;

if (priceToBeat !== null && Number.isFinite(currentPrice)) {
  if (diff >= 40) score += 3;
  else if (diff >= 15) score += 2;
  else if (diff > 0) score += 1;
  else if (diff <= -40) score -= 3;
  else if (diff <= -15) score -= 2;
  else if (diff < 0) score -= 1;

  if (momentumDelta >= 8) score += 1;
  else if (momentumDelta <= -8) score -= 1;

  if (diff !== null && Math.abs(diff) < 8) score += diff >= 0 ? -1 : 1;

  // Advanced Logic: Combine Polymarket Diff + Binance Trend
  if (score >= 3 || (score >= 1 && trendSignal === 1)) {
    prediction = 'UP';
    confidence = score >= 3 ? 'high' : 'medium';
  } else if (score <= -3 || (score <= -1 && trendSignal === -1)) {
    prediction = 'DOWN';
    confidence = score <= -3 ? 'high' : 'medium';
  } else {
    // Weak Signal: Rely on Binance Trend or Momentum
    noTrade = false;
    if (trendSignal === 1) {
      prediction = 'UP';
      confidence = 'low';
    } else if (trendSignal === -1) {
      prediction = 'DOWN';
      confidence = 'low';
    } else if (diff > 0) {
      prediction = 'UP';
      confidence = 'low';
    } else {
      prediction = 'DOWN';
      confidence = 'low';
    }
  }

  reason = `diff=${diff?.toFixed(2)}; momentum=${momentumDelta.toFixed(2)}; score=${score}; noTrade=${noTrade}`;
}

console.log(JSON.stringify({
  url,
  title: data.title,
  timeRange: data.timeRange,
  priceToBeat: data.priceToBeat,
  currentPrice,
  sampledPrices: prices,
  momentumDelta,
  diff,
  score,
  prediction,
  confidence,
  reason
}, null, 2));
