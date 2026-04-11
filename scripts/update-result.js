import fs from 'fs';
import path from 'path';

const [url, result, prediction = '', confidence = '', note = ''] = process.argv.slice(2);
if (!url || !result) {
  console.error('Usage: node update-result.js <url> <CORRECT|WRONG> [prediction] [confidence] [note]');
  process.exit(1);
}

const file = path.resolve('./backtest.txt');
const lines = fs.readFileSync(file, 'utf8').split('\n');
let updated = false;
const out = lines.map((line) => {
  if (!line || line.startsWith('#')) return line;
  const parts = line.split(' | ');
  if ((parts[8] || '').trim() === url) {
    if (prediction) parts[5] = prediction;
    if (confidence) parts[6] = confidence;
    parts[7] = result.toUpperCase();
    if (note) parts[8] = `${url} :: ${note}`;
    updated = true;
    return parts.join(' | ');
  }
  return line;
});

if (!updated) {
  console.error('No matching URL found in backtest.txt');
  process.exit(2);
}
fs.writeFileSync(file, out.join('\n'));
console.log('Updated result successfully.');
