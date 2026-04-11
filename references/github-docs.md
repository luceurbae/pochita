# Polymarket BTC Backtest Skill

## Overview

This skill helps run a semi-automated backtest workflow for Polymarket Bitcoin Up or Down short-duration markets.

## Components

- `live-market.js` — click the Go to live market button and capture the redirected live market URL
- `market-detail.js` — parse market title, time range, and price to beat from the market page
- `predict.js` — compare Binance BTCUSDT live price against Polymarket price-to-beat and produce a prediction
- `log-predict.js` — append the prediction to `backtest.txt`
- `final-price.js` — parse final price and compute the actual outcome from the Polymarket page
- `update-from-final.js` — update a logged row with CORRECT/WRONG using the parsed final result
- `summary.js` — summarize total trades, pending records, and win rate
- `run-market.js` — one-command workflow wrapper

## Typical Workflow

```bash
cd polymarket-btc-backtest
node run-market.js <market-url> predict
# wait until market closes
node run-market.js <market-url> finalize
node summary.js
```

## Notes

- Use Binance API only for live BTC price during prediction.
- Use Playwright/Polymarket page parsing for price-to-beat and final price.
- Keep `backtest.txt` append-oriented and review duplicates periodically.
