import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKTEST_FILE = path.resolve('/home/zaluk/.openclaw/workspace/backtest.txt');
const PREDICT_SCRIPT = path.join(__dirname, 'ai-analyze.js'); // AI Mode via OpenRouter
const GET_CURRENT_SCRIPT = path.join(__dirname, 'get-current-market.js');
const UPDATE_FINAL_SCRIPT = path.join(__dirname, 'smart-finalize.js'); // Pakai Smart Finalize via Playwright
const STATE_FILE = path.join(__dirname, 'auto-loop-state.json');

// Load state
let state = { 
  pending: [], 
  lastRun: null,
  totalPredictions: 0,
  totalFinalized: 0
};
if (fs.existsSync(STATE_FILE)) {
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) { 
    console.error('State file corrupted, resetting...'); 
  }
}

function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function runNode(script, args = []) {
  try {
    return execFileSync('node', [script, ...args], { 
      encoding: 'utf8', 
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 180000 // Naikin ke 3 menit biar AI + Browser kelar
    }).trim();
  } catch (e) {
    console.error(`Error running ${script}:`, e.message);
    return null;
  }
}

function forcePrediction(data) {
  // Override SKIP predictions to make a forced choice
  if (data.prediction === 'SKIP' || data.prediction === 'UNSET') {
    // Force based on momentum or default to UP if neutral
    const momentum = data.momentumDelta || 0;
    const diff = data.diff || 0;
    
    if (momentum > 0 || diff > 0) {
      data.prediction = 'UP';
      data.confidence = 'forced-low';
      data.reason += ' [FORCE: momentum positive]';
    } else {
      data.prediction = 'DOWN';
      data.confidence = 'forced-low';
      data.reason += ' [FORCE: momentum negative/neutral]';
    }
  }
  return data;
}

function updateBacktestLine(url, prediction, confidence, result, note) {
  // Read file, find line with URL, update it
  if (!fs.existsSync(BACKTEST_FILE)) return;
  
  const content = fs.readFileSync(BACKTEST_FILE, 'utf8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(url)) {
      // Replace the line, update prediction if was SKIP
      const parts = lines[i].split(' | ');
      if (parts.length >= 9) {
        // Keep timestamp and title from original
        const timestamp = parts[0].trim();
        const title = parts[1].trim();
        
        // Get market details from note (it has :: ...)
        const notePart = parts.slice(8).join(' | ');
        
        // Create new line with updated prediction and result
        const newLine = `${timestamp} | ${title} | ${parts[2].trim()} | ${parts[3].trim()} | ${prediction} | ${confidence} | ${result} | ${notePart} :: ${note || 'updated'}`;
        lines[i] = newLine;
      }
      break;
    }
  }
  
  fs.writeFileSync(BACKTEST_FILE, lines.join('\n'));
}

function getCurrentMarketUrl() {
  console.log('🔍 Generate URL market BTC 5m berdasarkan waktu UTC...');
  
  try {
    const raw = runNode(GET_CURRENT_SCRIPT);
    if (!raw) return null;
    
    const data = JSON.parse(raw);
    console.log(`✅ Market slot: ${data.currentSlotTime}`);
    console.log(`   URL: ${data.currentUrl}`);
    return data.currentUrl;
  } catch (e) {
    console.error('❌ Gagal generate URL:', e.message);
    return null;
  }
}

async function predictMarket(url) {
  console.log(`\n📊 [AI MODE] Memprediksi: ${url}`);
  
  try {
    // AI analyze script log ke file secara langsung, jadi kita gak perlu parse JSON return-nya di sini
    runNode(PREDICT_SCRIPT, [url]);
    console.log('✅ AI Prediction logged to backtest.txt');
    
    // Tambahkan ke pending list secara manual karena ai-analyze.js gak return JSON state
    state.pending.push({ 
      url, 
      predictedAt: Date.now(),
      prediction: 'AI-PENDING', // Akan diupdate pas finalize
      confidence: 'AI-HIGH'
    });
    state.totalPredictions++;
    saveState();
    
    return { prediction: 'AI-PROCESSED' };
  } catch (e) {
    console.error('❌ Gagal memprediksi via AI:', e.message);
    return null;
  }
}

async function finalizeMarket(url, predictedAt, prediction) {
  console.log(`\n⏳ Finalizing: ${url}`);
  
  try {
    // 1. Ambil data diff & momentum dari backtest.txt buat bahan belajar
    const lineContent = fs.readFileSync(BACKTEST_FILE, 'utf8').split('\n').find(l => l.includes(url));
    let diffVal = '0', momVal = '0';
    if (lineContent) {
      const diffMatch = lineContent.match(/diff=([-\d.]+)/);
      const momMatch = lineContent.match(/momentum=([-\d.]+)/);
      if (diffMatch) diffVal = diffMatch[1];
      if (momMatch) momVal = momMatch[1];
    }

    // 2. Get final result
    const result = runNode(UPDATE_FINAL_SCRIPT, [url]);
    if (!result) {
      console.log('⚠️  Gagal finalize (no result)');
      return false;
    }
    
    console.log(`   Final result: ${result}`);
    
    // 3. Extract CORRECT or WRONG
    let finalResult = 'PENDING';
    let finalOutcome = '';
    
    if (result.includes('CORRECT')) finalResult = 'CORRECT';
    else if (result.includes('WRONG')) finalResult = 'WRONG';
    else if (result.includes('final=UP')) {
      finalOutcome = 'UP';
      finalResult = prediction === 'UP' ? 'CORRECT' : 'WRONG';
    } else if (result.includes('final=DOWN')) {
      finalOutcome = 'DOWN';
      finalResult = prediction === 'DOWN' ? 'CORRECT' : 'WRONG';
    }
    
    // 4. Update backtest line
    updateBacktestLine(url, prediction, 'medium', finalResult, result);
    
    // 5. SELF-IMPROVEMENT: Kalau salah, suruh Pochita belajar!
    if (finalResult === 'WRONG' && finalOutcome) {
      console.log('🧠 Pochita is learning from this mistake...');
      runNode(path.join(__dirname, 'learn-from-loss.js'), [url, prediction, finalOutcome, diffVal, momVal]);
    }
    
    state.totalFinalized++;
    console.log(`✅ Finalized: ${finalResult}`);
    return true;
  } catch (e) {
    console.error('❌ Gagal finalize:', e.message);
    return false;
  }
}

async function finalizeOldMarkets() {
  const now = Date.now();
  const TEN_MINUTES = 10 * 60 * 1000;
  
  const toFinalize = state.pending.filter(p => (now - p.predictedAt) >= TEN_MINUTES);
  const stillPending = state.pending.filter(p => (now - p.predictedAt) < TEN_MINUTES);
  
  if (toFinalize.length === 0) {
    console.log('⏭️  Tidak ada market untuk difinalize');
    return;
  }
  
  console.log(`\n⏳ FINALIZING ${toFinalize.length} OLD MARKETS...`);
  
  for (const item of toFinalize) {
    await finalizeMarket(item.url, item.predictedAt, item.prediction);
    await new Promise(r => setTimeout(r, 2000)); // Delay 2s between finalizations
  }
  
  state.pending = stillPending;
  saveState();
  
  console.log(`\n✅ Finalization complete. Pending: ${stillPending.length}`);
}

async function runOnce() {
  console.log('\n🔄 === AUTO BACKTEST LOOP ===');
  console.log(`⏰ ${new Date().toISOString()}`);
  
  // Step 1: Finalize old markets first
  await finalizeOldMarkets();
  
  // Step 2: Generate market URL
  const url = getCurrentMarketUrl();
  if (!url) {
    console.log('⏭️  Skip cycle: gagal generate URL');
    return false;
  }
  
  // Step 3: Predict (forced, no SKIP)
  const result = await predictMarket(url);
  if (!result) {
    console.log('⏭️  Skip cycle: gagal prediksi');
    return false;
  }
  
  console.log('\n✅ Cycle selesai!');
  return true;
}

// Main execution
const mode = process.argv[2] || 'once';

if (mode === 'once') {
  await runOnce();
} else if (mode === 'loop') {
  console.log('🔄 Memulai loop setiap 5 menit...');
  console.log('   Tekan Ctrl+C untuk berhenti\n');
  
  setInterval(async () => {
    try {
      await runOnce();
    } catch (e) {
      console.error('❌ Error dalam loop:', e.message);
    }
  }, 5 * 60 * 1000); // 5 menit
  
  // Jalankan pertama kali
  await runOnce();
} else {
  console.error('Usage: node auto-loop.js [once|loop]');
  process.exit(1);
}
