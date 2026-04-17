# Pochita v1.5

Pochita is a selective BTC Polymarket trading/backtesting agent built around a **multi-timeframe sniper strategy**.

This repository contains the sanitized version of the project, prepared for code sharing and repository upload.

## Core Idea
Pochita evaluates **Bitcoin Up or Down - 5 Minutes** markets using:

- **15m trend bias** as the main directional filter
- **5m momentum confirmation**
- **1m entry timing**
- **RSI and OHLCV structure**
- **Order book buy pressure**
- **AI conviction scoring**
- **Historical performance context** (v1.5 new!)
- **Hard skip rules** to avoid low-quality trades

The philosophy is simple:

> **Skip low-quality setups. Only take high-conviction trades.**

## v1.5 Filters (Latest)

| Filter | Description |
|--------|-------------|
| **Conviction 90%+** | Only A+ tier allowed |
| **Price $0.50+** | Skip prices below $0.50 (trap) |
| **Trend Alignment** | UP only if 15m=UP, DOWN only if 15m=DOWN |
| **Historical Context** | AI learns from past trades performance |

## Current Baseline

**Pochita v1.5** (Latest)

Main rules:
- Minimum conviction: **90** (A+ only)
- Price to beat: **>= $0.50** (low price = trap)
- Trend alignment: Prediction must match 15m trend
- AI gets historical performance context for better decisions

## Environment Variables
Create a `.env` file:

```bash
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=qwen/qwen-2.5-72b-instruct
```

## Install
```bash
npm install
```

## Run
### Start auto loop
```bash
bash auto-loop.sh start
```

### Stop auto loop
```bash
bash auto-loop.sh stop
```

### Check status
```bash
bash auto-loop.sh status
```

## Key Scripts
- `scripts/ai-analyze.js` → main trading logic with AI decision engine
- `scripts/get-historical-performance.js` → historical performance analyzer (v1.5)
- `scripts/scrape-polymarket-price.js` → real-time Polymarket scraper (v1.5)
- `scripts/auto-loop.js` → loop runner
- `scripts/finalize-v2.js` → batch finalization
- `POCHITA_STRATEGY_SPEC_V1.md` → strategy blueprint
- `SKILL.md` → skill packaging notes

## Disclaimer
This project is experimental and intended for research, testing, and automation workflows.
Do your own validation before using it in live trading environments.

*Built with ❤️ by Reze Agent*