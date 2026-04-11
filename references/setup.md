# Setup

## Requirements

- Node.js 18+
- npm
- Playwright Chromium installed

## Install

```bash
cd polymarket-btc-backtest
npm install
npx playwright install chromium
```

## Main commands

```bash
node run-market.js <market-url> predict
node run-market.js <market-url> finalize
node summary.js
```
