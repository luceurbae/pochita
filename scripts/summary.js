import fs from 'fs';
import path from 'path';

const file = path.resolve('./backtest.txt');
const lines = fs.readFileSync(file, 'utf8').split('\n').filter(l => l && !l.startsWith('#'));
let correct = 0, wrong = 0, pending = 0;
const byPrediction = {};
for (const line of lines) {
  const parts = line.split(' | ');
  const prediction = (parts[5] || '').trim() || 'UNSET';
  const result = (parts[7] || '').trim().toUpperCase();
  if (!byPrediction[prediction]) byPrediction[prediction] = { correct: 0, wrong: 0, pending: 0 };
  if (result === 'CORRECT') { correct++; byPrediction[prediction].correct++; }
  else if (result === 'WRONG') { wrong++; byPrediction[prediction].wrong++; }
  else { pending++; byPrediction[prediction].pending++; }
}
const totalDone = correct + wrong;
const winRate = totalDone ? ((correct / totalDone) * 100).toFixed(2) : '0.00';
console.log(JSON.stringify({ total: lines.length, correct, wrong, pending, winRate, byPrediction }, null, 2));
