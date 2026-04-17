import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-72b-instruct'; // Model Qwen Stabil 72B

if (!API_KEY) {
  console.error('Missing OPENROUTER_API_KEY environment variable');
  process.exit(1);
}

const url = process.argv[2];
if (!url) {
  console.error('Usage: node ai-analyze.js <market-url>');
  process.exit(1);
}

const here = path.dirname(new URL(import.meta.url).pathname);
const detailScript = path.join(here, 'market-detail.js');

const raw = execFileSync('node', [detailScript, url], { encoding: 'utf8' });
const data = JSON.parse(raw);

function toCandle(kline) {
  return {
    O: Number(kline[1]),
    H: Number(kline[2]),
    L: Number(kline[3]),
    C: Number(kline[4]),
    V: Number(kline[5])
  };
}

function getTrendFromCandles(candles) {
  const firstOpen = candles[0].O;
  const lastClose = candles[candles.length - 1].C;
  return lastClose >= firstOpen ? 'UP' : 'DOWN';
}

function classifyCandle(candle) {
  const range = Math.max(candle.H - candle.L, 0.0001);
  const body = Math.abs(candle.C - candle.O);
  const upperWick = candle.H - Math.max(candle.O, candle.C);
  const lowerWick = Math.min(candle.O, candle.C) - candle.L;
  const bodyRatio = body / range;

  const bullish = candle.C > candle.O;
  const bearish = candle.C < candle.O;
  const indecisive = bodyRatio < 0.35;
  const strongCloseUp = bullish && ((candle.H - candle.C) / range) < 0.2 && bodyRatio > 0.45;
  const weakCloseDown = bearish && ((candle.C - candle.L) / range) < 0.2 && bodyRatio > 0.45;
  const lowerRejection = lowerWick / range > 0.35 && candle.C > candle.O;
  const upperRejection = upperWick / range > 0.35 && candle.C < candle.O;

  return {
    range,
    body,
    upperWick,
    lowerWick,
    bodyRatio,
    bullish,
    bearish,
    indecisive,
    strongCloseUp,
    weakCloseDown,
    lowerRejection,
    upperRejection
  };
}

async function getBinanceData() {
  const priceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
  const priceData = await priceRes.json();
  const currentPrice = Number(priceData.price);

  const kline1mRes = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=5');
  const kline5mRes = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=5m&limit=3');
  const kline15mRes = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=3');
  
  const klines1m = await kline1mRes.json();
  const klines5m = await kline5mRes.json();
  const klines15m = await kline15mRes.json();

  const candles1m = klines1m.map(toCandle);
  const candles5m = klines5m.map(toCandle);
  const candles15m = klines15m.map(toCandle);
  
  const closes1m = candles1m.map(c => c.C);
  const trend1m = getTrendFromCandles(candles1m);
  const trend5m = getTrendFromCandles(candles5m);
  const trend15m = getTrendFromCandles(candles15m);
  
  const last1m = candles1m[candles1m.length - 1];
  const last5m = candles5m[candles5m.length - 1];
  const last15m = candles15m[candles15m.length - 1];

  const candle1mState = classifyCandle(last1m);
  const candle5mState = classifyCandle(last5m);
  const candle15mState = classifyCandle(last15m);

  const depthRes = await fetch('https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=10');
  const depthData = await depthRes.json();
  const bidVol = depthData.bids.reduce((a, b) => a + Number(b[1]), 0);
  const askVol = depthData.asks.reduce((a, b) => a + Number(b[1]), 0);
  const depthRatio = bidVol / (bidVol + askVol);

  return {
    currentPrice,
    closes1m,
    trend1m,
    trend5m,
    trend15m,
    depthRatio,
    candle1mState,
    candle5mState,
    candle15mState,
    ohlcv1m: last1m,
    ohlcv5m: last5m,
    ohlcv15m: last15m
  };
}

// Time-Window Sync: Cek apakah kita masih ada di "zona aman" 5 menitan
const now = new Date();
const currentMinute = now.getMinutes();
const currentSecond = now.getSeconds();
const minutesIntoPeriod = currentMinute % 5;
const secondsIntoPeriod = (minutesIntoPeriod * 60) + currentSecond;

// Kalau udah lewat 4 menit 30 detik (270 detik), mending SKIP biar gak kejepit di tengah jalan
if (secondsIntoPeriod > 270) {
  console.log('[TIME SYNC] Terlalu mepet ke akhir periode. Skipping.');
  process.exit(0);
}

// Langsung analisa tanpa delay (untuk hindari ETIMEDOUT)
const priceToBeat = Number(data.priceToBeat.replace(/[^0-9.]/g, ''));
const binanceData = await getBinanceData();
const currentPrice = binanceData.currentPrice;
const diff = currentPrice - priceToBeat;

const changes = binanceData.closes1m.slice(1).map((c, i) => c - binanceData.closes1m[i]);
const changeCount = Math.max(changes.length, 1);
const avgGain = changes.filter(c => c > 0).reduce((a, b) => a + b, 0) / changeCount;
const avgLoss = Math.abs(changes.filter(c => c < 0).reduce((a, b) => a + b, 0) / changeCount);
const rs = avgGain / (avgLoss === 0 ? 1 : avgLoss);
const rsi = 100 - (100 / (1 + rs));

let memory = '';
try {
  memory = fs.readFileSync(path.join(here, '../strategy_memory.md'), 'utf8');
} catch (e) { memory = 'No past lessons yet.'; }

// Get historical performance for AI context
let performanceContext = '';
try {
  const perfScript = path.join(here, 'get-historical-performance.js');
  const { execSync } = await import('child_process');
  const perfOutput = execSync(`node ${perfScript} 2>/dev/null`, { encoding: 'utf8', timeout: 10000 });
  const perfData = JSON.parse(perfOutput);
  performanceContext = perfData.insight;
} catch (e) {
  performanceContext = 'No historical data available.';
}

const buyPressurePct = binanceData.depthRatio * 100;
const hardSkipReasons = [];

if (Math.abs(diff) < 5) hardSkipReasons.push('Diff terlalu kecil (< $5)');
if (rsi >= 45 && rsi <= 55) hardSkipReasons.push(`RSI netral (${rsi.toFixed(2)})`);
if (binanceData.candle5mState.indecisive) hardSkipReasons.push('Candle 5m kecil / indecisive');
if (binanceData.trend15m !== binanceData.trend5m) hardSkipReasons.push(`Trend 15m (${binanceData.trend15m}) konflik dengan 5m (${binanceData.trend5m})`);

let setupType = 'NO_TRADE';
let ruleBias = 'SKIP';

const upConditions = [
  binanceData.trend15m === 'UP',
  binanceData.trend5m === 'UP',
  binanceData.candle1mState.strongCloseUp || binanceData.candle1mState.lowerRejection,
  buyPressurePct >= 55,
  diff > 0
];

const downConditions = [
  binanceData.trend15m === 'DOWN',
  binanceData.trend5m === 'DOWN',
  binanceData.candle1mState.weakCloseDown || binanceData.candle1mState.upperRejection,
  buyPressurePct <= 45,
  diff < 0
];

const upScore = upConditions.filter(Boolean).length;
const downScore = downConditions.filter(Boolean).length;

if (upScore >= 4 && upScore > downScore) {
  ruleBias = 'UP';
  setupType = 'TREND_CONTINUATION_UP';
} else if (downScore >= 4 && downScore > upScore) {
  ruleBias = 'DOWN';
  setupType = 'TREND_CONTINUATION_DOWN';
} else {
  ruleBias = 'SKIP';
  setupType = 'NO_TRADE';
}

const userPrompt = `
You are Pochita, a BTC sniper trader following a strict rule-based framework.

RULE ENGINE SUMMARY:
- 15m = main trend bias
- 5m = momentum confirmation
- 1m = entry timing
- Hard skip if diff too small, RSI neutral, 5m indecisive, or 15m conflicts with 5m
- Only take high-conviction trades

HARD SKIP REASONS:
${hardSkipReasons.length ? hardSkipReasons.map(r => `- ${r}`).join('\n') : '- None'}

## 📊 HISTORICAL PERFORMANCE CONTEXT:
(Harness this data to improve predictions)
${performanceContext || 'No historical data available yet.'}

RULE BIAS:
- Setup Type: ${setupType}
- Rule Bias: ${ruleBias}
- UP Score: ${upScore}/5
- DOWN Score: ${downScore}/5

PAST LESSONS:
${memory}

MARKET DATA:
- Price to Beat: $${priceToBeat}
- Current Price: $${currentPrice}
- Diff: $${diff.toFixed(2)}
- RSI (1m): ${rsi.toFixed(2)}
- Trend 1m: ${binanceData.trend1m}
- Trend 5m: ${binanceData.trend5m}
- Trend 15m: ${binanceData.trend15m}
- Buy Pressure: ${buyPressurePct.toFixed(1)}%

CANDLE STATE:
- 1m: strongCloseUp=${binanceData.candle1mState.strongCloseUp}, weakCloseDown=${binanceData.candle1mState.weakCloseDown}, lowerRejection=${binanceData.candle1mState.lowerRejection}, upperRejection=${binanceData.candle1mState.upperRejection}
- 5m indecisive: ${binanceData.candle5mState.indecisive}

OHLCV DATA:
- 1m: O:$${binanceData.ohlcv1m.O}, H:$${binanceData.ohlcv1m.H}, L:$${binanceData.ohlcv1m.L}, C:$${binanceData.ohlcv1m.C}, V:$${binanceData.ohlcv1m.V}
- 5m: O:$${binanceData.ohlcv5m.O}, H:$${binanceData.ohlcv5m.H}, L:$${binanceData.ohlcv5m.L}, C:$${binanceData.ohlcv5m.C}, V:$${binanceData.ohlcv5m.V}
- 15m: O:$${binanceData.ohlcv15m.O}, H:$${binanceData.ohlcv15m.H}, L:$${binanceData.ohlcv15m.L}, C:$${binanceData.ohlcv15m.C}, V:$${binanceData.ohlcv15m.V}

Instructions:
1. Respect hard skip conditions.
2. Only return UP or DOWN if the setup is clear and high quality.
3. Use this conviction scale:
   - 90-100 = A+ setup — ONLY THESE ARE ALLOWED
   - 80-89 = A setup — DISALLOWED
   - 75-79 = B setup — DISALLOWED
   - below 90 = NO TRADE — return SKIP
4. ⚠️ TREND ALIGNMENT RULE (v1.5):
   - Only predict UP if 15m trend is UP
   - Only predict DOWN if 15m trend is DOWN
   - If your prediction conflicts with 15m trend, return SKIP
5. ⚠️ PRICE FILTER (v1.5):
   - If price to beat is BELOW $0.50, return SKIP (low price = trap)
6. Your prediction must align with RULE BIAS. If your view conflicts with RULE BIAS, return SKIP.
7. If hard skip reasons exist and they are serious, prefer SKIP.

Respond exactly with:
PREDIKSI: [UP/DOWN/SKIP]
CONVICTION: [0-100]%
SETUP: [TREND_CONTINUATION_UP/TREND_CONTINUATION_DOWN/NO_TRADE]
ALASAN: [short reason]
`;

console.log(`[AI ANALYZING] Market: ${data.timeRange}`);

try {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'HTTP-Referer': 'https://github.com/luceurbae/pochita-agent-skills',
      'X-Title': 'Pochita Backtest Agent',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  const responseData = await res.json();
  
  if (!responseData.choices || !responseData.choices[0]) {
    throw new Error(`API Error: ${JSON.stringify(responseData.error || 'No choices returned')}`);
  }
  
  const aiContent = responseData.choices[0].message.content;
  
  let aiPrediction = 'SKIP';
  let aiConviction = 0;
  let aiSetup = setupType;

  if (aiContent.includes('PREDIKSI: DOWN')) aiPrediction = 'DOWN';
  else if (aiContent.includes('PREDIKSI: UP')) aiPrediction = 'UP';
  
  const convMatch = aiContent.match(/CONVICTION:\s*(\d+)%/);
  if (convMatch) aiConviction = parseInt(convMatch[1]);

  const setupMatch = aiContent.match(/SETUP:\s*([^\n]+)/);
  if (setupMatch) aiSetup = setupMatch[1].trim();

  if (hardSkipReasons.length > 0) {
    console.log(`[HARD SKIP] ${hardSkipReasons.join('; ')}`);
    aiPrediction = 'SKIP';
  }

  if (aiPrediction !== 'SKIP' && ruleBias !== 'SKIP' && aiPrediction !== ruleBias) {
    console.log(`[BIAS FILTER] Prediction ${aiPrediction} conflicts with rule bias ${ruleBias}. Switching to SKIP.`);
    aiPrediction = 'SKIP';
  }

  if (aiPrediction !== 'SKIP' && aiConviction < 75) {
    console.log(`[SNIPER FILTER] Prediction ${aiPrediction} rejected. Conviction ${aiConviction}% < 75%. Switching to SKIP.`);
    aiPrediction = 'SKIP';
  }

  const aiReason = aiContent.split('ALASAN:')[1]?.trim().substring(0, 160) || 'AI Analysis';

  if (aiPrediction !== 'SKIP') {
    const cleanLog = `${new Date().toISOString()} | ${data.title} | ${data.timeRange} | $${priceToBeat} | ${currentPrice} | ${aiPrediction} | AI-ANALYST | PENDING | ${url} :: conviction=${aiConviction}; setup=${aiSetup}; diff=${diff.toFixed(2)}; buyPressure=${buyPressurePct.toFixed(1)}; reason=${aiReason}`;
    fs.appendFileSync(path.join(here, '../../backtest.txt'), cleanLog + '\n');
  } else {
    console.log('[SKIPPED] Market conditions not favorable.');
  }

  const reasoningLog = `[${new Date().toISOString()}] | ${url} | ${aiPrediction} | CONVICTION: ${aiConviction}% | SETUP: ${aiSetup} | RULE_BIAS: ${ruleBias} | UP_SCORE: ${upScore} | DOWN_SCORE: ${downScore} | RSI: ${rsi.toFixed(2)} | Trend1m: ${binanceData.trend1m} | Trend5m: ${binanceData.trend5m} | Trend15m: ${binanceData.trend15m} | BuyPressure: ${buyPressurePct.toFixed(1)}% | Diff: ${diff.toFixed(2)} | REASON: ${aiReason}${hardSkipReasons.length ? ` | HARD_SKIP: ${hardSkipReasons.join(', ')}` : ''}\n`;
  fs.appendFileSync(path.join(here, '../ai-reasoning.txt'), reasoningLog);

  console.log('[AI RESULT]', aiPrediction, `(${aiConviction}%)`, '-', aiReason);
  console.log('[LOGGED] Entry added.');

} catch (e) {
  console.error('[AI ERROR]', e.message);
  
  // Auto-Retry Logic: Tunggu 1 menit kalau error
  console.log('[RETRY] Menunggu 60 detik sebelum mencoba ulang...');
  await new Promise(r => setTimeout(r, 60000));
  
  // Cek lagi waktu setelah nunggu
  const retryNow = new Date();
  const retrySeconds = ((retryNow.getMinutes() % 5) * 60) + retryNow.getSeconds();
  
  if (retrySeconds > 270) {
    console.log('[TIME SYNC] Setelah retry, waktu sudah tidak aman. Skipping this market.');
    process.exit(0);
  }

  // Coba request sekali lagi setelah nunggu
  try {
    const res2 = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': 'https://github.com/luceurbae/pochita-agent-skills',
        'X-Title': 'Pochita Backtest Agent',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    const responseData2 = await res2.json();
    if (!responseData2.choices || !responseData2.choices[0]) throw new Error('Retry Failed');
    
    const aiContent2 = responseData2.choices[0].message.content;
    let aiPrediction2 = 'SKIP';
    let aiConviction2 = 0;
    let aiSetup2 = setupType;

    if (aiContent2.includes('PREDIKSI: DOWN')) aiPrediction2 = 'DOWN';
    else if (aiContent2.includes('PREDIKSI: UP')) aiPrediction2 = 'UP';

    const convMatch2 = aiContent2.match(/CONVICTION:\s*(\d+)%/);
    if (convMatch2) aiConviction2 = parseInt(convMatch2[1]);

    const setupMatch2 = aiContent2.match(/SETUP:\s*([^\n]+)/);
    if (setupMatch2) aiSetup2 = setupMatch2[1].trim();

    if (hardSkipReasons.length > 0) {
      aiPrediction2 = 'SKIP';
    }

    if (aiPrediction2 !== 'SKIP' && ruleBias !== 'SKIP' && aiPrediction2 !== ruleBias) {
      aiPrediction2 = 'SKIP';
    }

    if (aiPrediction2 !== 'SKIP' && aiConviction2 < 75) {
      aiPrediction2 = 'SKIP';
    }
    
    const aiReason2 = aiContent2.split('ALASAN:')[1]?.trim().substring(0, 160) || 'AI Retry Analysis';

    if (aiPrediction2 !== 'SKIP') {
      const cleanLog = `${new Date().toISOString()} | ${data.title} | ${data.timeRange} | $${priceToBeat} | ${currentPrice} | ${aiPrediction2} | AI-ANALYST-RETRY | PENDING | ${url} :: conviction=${aiConviction2}; setup=${aiSetup2}; diff=${diff.toFixed(2)}; buyPressure=${buyPressurePct.toFixed(1)}; reason=${aiReason2}`;
      fs.appendFileSync(path.join(here, '../../backtest.txt'), cleanLog + '\n');
      console.log('[AI RESULT] Retry sukses:', aiPrediction2, `(${aiConviction2}%)`);
    } else {
      console.log('[RETRY SKIPPED] Retry result still not qualified.');
    }

    const reasoningLog = `[${new Date().toISOString()}] | ${url} | ${aiPrediction2} | CONVICTION: ${aiConviction2}% | SETUP: ${aiSetup2} | MODE: RETRY | RSI: ${rsi.toFixed(2)} | Trend1m: ${binanceData.trend1m} | Trend5m: ${binanceData.trend5m} | Trend15m: ${binanceData.trend15m} | BuyPressure: ${buyPressurePct.toFixed(1)}% | Diff: ${diff.toFixed(2)} | REASON: ${aiReason2}${hardSkipReasons.length ? ` | HARD_SKIP: ${hardSkipReasons.join(', ')}` : ''}\n`;
    fs.appendFileSync(path.join(here, '../ai-reasoning.txt'), reasoningLog);

  } catch (e2) {
    console.error('[AI ERROR] Retry gagal. Applying strict fallback.');

    let fallbackPrediction = 'SKIP';
    let fallbackSetup = 'NO_TRADE';
    let fallbackConviction = 0;
    let fallbackReason = 'Strict fallback: no qualified setup.';

    if (hardSkipReasons.length === 0) {
      if (upScore >= 4 && upScore > downScore) {
        fallbackPrediction = 'UP';
        fallbackSetup = 'TREND_CONTINUATION_UP';
        fallbackConviction = 75;
        fallbackReason = `Strict fallback UP from rule engine (upScore=${upScore}, downScore=${downScore}, buyPressure=${buyPressurePct.toFixed(1)}%, diff=${diff.toFixed(2)})`;
      } else if (downScore >= 4 && downScore > upScore) {
        fallbackPrediction = 'DOWN';
        fallbackSetup = 'TREND_CONTINUATION_DOWN';
        fallbackConviction = 75;
        fallbackReason = `Strict fallback DOWN from rule engine (upScore=${upScore}, downScore=${downScore}, buyPressure=${buyPressurePct.toFixed(1)}%, diff=${diff.toFixed(2)})`;
      }
    }

    if (fallbackPrediction !== 'SKIP') {
      const cleanLog = `${new Date().toISOString()} | ${data.title} | ${data.timeRange} | $${priceToBeat} | ${currentPrice} | ${fallbackPrediction} | AI-FALLBACK-STRICT | PENDING | ${url} :: conviction=${fallbackConviction}; setup=${fallbackSetup}; diff=${diff.toFixed(2)}; buyPressure=${buyPressurePct.toFixed(1)}; reason=${fallbackReason}`;
      fs.appendFileSync(path.join(here, '../../backtest.txt'), cleanLog + '\n');
    }

    const reasoningLog = `[${new Date().toISOString()}] | ${url} | ${fallbackPrediction} | CONVICTION: ${fallbackConviction}% | SETUP: ${fallbackSetup} | MODE: FALLBACK | RULE_BIAS: ${ruleBias} | UP_SCORE: ${upScore} | DOWN_SCORE: ${downScore} | RSI: ${rsi.toFixed(2)} | Trend1m: ${binanceData.trend1m} | Trend5m: ${binanceData.trend5m} | Trend15m: ${binanceData.trend15m} | BuyPressure: ${buyPressurePct.toFixed(1)}% | Diff: ${diff.toFixed(2)} | REASON: ${fallbackReason}${hardSkipReasons.length ? ` | HARD_SKIP: ${hardSkipReasons.join(', ')}` : ''}\n`;
    fs.appendFileSync(path.join(here, '../ai-reasoning.txt'), reasoningLog);
  }
}
