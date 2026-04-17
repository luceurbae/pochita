/**
 * get-historical-performance.js
 * Pochita v2 - Get historical performance for AI context
 * Returns last N trades with win/loss data for AI to learn from patterns
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RESOLVED_FILE = path.join(__dirname, '../../pochita-live-paper/resolved-paper-trades.txt');
const TRADES_FILE = path.join(__dirname, '../../pochita-live-paper/live-paper-trades.txt');

function getLastLines(file, n = 20) {
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  return lines.slice(-n);
}

function analyzePerformance() {
  const lines = getLastLines(RESOLVED_FILE, 30);
  
  let total = 0, wins = 0, losses = 0, pending = 0;
  let upTotal = 0, upWins = 0, downTotal = 0, downWins = 0;
  let lowPriceWins = 0, lowPriceLosses = 0;
  let highPriceWins = 0, highPriceLosses = 0;
  
  const recentTrades = [];
  
  for (const line of lines) {
    if (!line.includes('CORRECT') && !line.includes('WRONG') && !line.includes('PENDING')) continue;
    if (line.includes('timestamp') || line.includes('===') || line.includes('---')) continue;
    
    // Parse: timestamp | prediction | price | stake | actual | result | url
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 6) continue;
    
    const prediction = parts[1];
    const price = parseFloat(parts[2]);
    const result = parts[5];
    
    total++;
    
    if (result === 'CORRECT') {
      wins++;
      if (prediction === 'UP') upWins++;
      if (prediction === 'DOWN') downWins++;
      if (price < 0.50) lowPriceWins++;
      if (price >= 0.60) highPriceWins++;
    } else if (result === 'WRONG') {
      losses++;
      if (prediction === 'UP') upTotal++;
      if (prediction === 'DOWN') downTotal++;
      if (price < 0.50) lowPriceLosses++;
      if (price >= 0.60) highPriceLosses++;
    } else if (result === 'PENDING') {
      pending++;
    }
    
    recentTrades.push({
      prediction,
      price,
      result,
      timestamp: parts[0]
    });
  }
  
  const winRate = total > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '0.0';
  const upWinRate = upTotal > 0 ? ((upWins / upTotal) * 100).toFixed(1) : '0.0';
  const downWinRate = downTotal > 0 ? ((downWins / downTotal) * 100).toFixed(1) : '0.0';
  const lowPriceWinRate = (lowPriceWins + lowPriceLosses) > 0 
    ? ((lowPriceWins / (lowPriceWins + lowPriceLosses)) * 100).toFixed(1) 
    : 'N/A';
  const highPriceWinRate = (highPriceWins + highPriceLosses) > 0 
    ? ((highPriceWins / (highPriceWins + highPriceLosses)) * 100).toFixed(1) 
    : 'N/A';
  
  return {
    total,
    wins,
    losses,
    pending,
    winRate: `${winRate}%`,
    upWinRate: `${upWinRate}%`,
    downWinRate: `${downWinRate}%`,
    lowPriceWinRate: `${lowPriceWinRate}%`,
    highPriceWinRate: `${highPriceWinRate}%`,
    recentTrades: recentTrades.slice(-10) // Last 10 trades
  };
}

async function main() {
  const perf = analyzePerformance();
  
  console.log(JSON.stringify({
    performance: perf,
    insight: `
## Historical Performance Context (Last ${perf.total} Trades)

### Overall Win Rate: ${perf.winRate}

### By Direction:
- UP predictions: ${perf.upWinRate} win rate
- DOWN predictions: ${perf.downWinRate} win rate

### By Price Range:
- Low price (<$0.50): ${perf.lowPriceWinRate} win rate — HIGH RISK, AVOID
- High price (>$0.60): ${perf.highPriceWinRate} win rate — MORE RELIABLE

### Key Lessons:
1. LOW PRICE IS A TRAP — prices below $0.50 have performed poorly
2. HIGH PRICE IS SAFER — prices above $0.60 have better win rate
3. UP predictions are riskier — consider being more selective on UP
4. DOWN predictions perform slightly better when 15m trend is DOWN

### Recent Trades:
${perf.recentTrades.map(t => `${t.timestamp?.split('T')[1]?.substring(0,8)}: ${t.prediction} @ $${t.price} = ${t.result}`).join('\n')}
    `.trim()
  }, null, 2));
}

main().catch(console.error);