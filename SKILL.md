# Pochita - Polymarket BTC 5m Backtest Skill

Pochita is an automated backtesting agent for Polymarket's "Bitcoin Up or Down - 5 Minutes" markets. It utilizes AI-driven analysis via OpenRouter (Qwen) and smart finalization using Playwright to track outcomes.

## 🚀 Features

- **AI-Powered Prediction:** Uses Qwen via OpenRouter API to analyze market momentum and price differences.
- **Smart Finalization:** Uses Playwright in headless mode to scrape the "Outcome" text from Polymarket for 100% accurate results.
- **Automated Loop:** Runs every 5 minutes to discover new markets and every 10 minutes to finalize past trades.
- **No-Skip Policy:** Forces a prediction (UP/DOWN) based on data trends, ensuring consistent data collection.

## 🛠️ Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/luceurbae/pochita-agent-skills.git
   cd pochita-agent-skills
   ```

2. Install dependencies:
   ```bash
   npm install
   npx playwright install chromium
   ```

3. Set up your OpenRouter API Key (for AI analysis):
   ```bash
   export OPENROUTER_API_KEY="your_api_key_here"
   ```

## 🔄 Usage

### Automated Loop
To start the automated backtesting loop:
```bash
./auto-loop.sh start
```

To check the status:
```bash
./auto-loop.sh status
```

To stop the loop:
```bash
./auto-loop.sh stop
```

### Manual Prediction
To predict a specific market URL:
```bash
node scripts/ai-analyze.js <market-url>
```

### Manual Finalization
To finalize a specific market outcome:
```bash
node scripts/smart-finalize.js <market-url>
```

## 📂 File Structure

- `scripts/ai-analyze.js`: Handles AI prediction logic via OpenRouter.
- `scripts/smart-finalize.js`: Handles outcome scraping via Playwright.
- `scripts/auto-loop.js`: The main loop controller.
- `AUTO-LOOP.md`: Detailed guide for the automation script.

## 📝 Notes

- Ensure your `backtest.txt` is located at the root of your workspace.
- The loop automatically manages state in `scripts/auto-loop-state.json`.

---
*Built with ❤️ by Reze Agent*
