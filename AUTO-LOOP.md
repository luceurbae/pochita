# Auto Backtest Loop - Documentation

This script automatically runs Polymarket BTC 5m predictions every 5 minutes and logs the results to `backtest.txt`.

## ✨ Features

✅ **Auto-discover market** - Generates BTC 5m market URLs based on UTC time.  
✅ **Force prediction** - No SKIPs; always predicts UP or DOWN.  
✅ **Auto-log** - Automatically records to `backtest.txt` in the root workspace.  
✅ **Auto-finalize** - After 10 minutes, results are automatically updated (CORRECT/WRONG).  
✅ **State management** - Tracks pending predictions to avoid duplicates.

## 🎮 Management Commands

```bash
# Start loop
./auto-loop.sh start

# Stop loop
./auto-loop.sh stop

# Check status
./auto-loop.sh status

# View logs
./auto-loop.sh logs
```

## 📁 File Locations

- **Script:** `./scripts/auto-loop.js`
- **State:** `./scripts/auto-loop-state.json`
- **PID:** `../../auto-loop.pid`
- **Log:** `../../logs/auto-loop.log`
- **Backtest Data:** `../../backtest.txt`

## ⚙️ How it Works

1. **Discovery:** Calculates the current 5-minute slot URL.
2. **Prediction:** Calls `ai-analyze.js` to get an AI-powered prediction.
3. **Logging:** Appends the result to `backtest.txt` with a "PENDING" status.
4. **Finalization:** Every 10 minutes, it checks pending markets using `smart-finalize.js` (Playwright) and updates the status to CORRECT or WRONG.

---
*Keep Pochita running for continuous data collection!* 🐶
