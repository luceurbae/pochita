# Pochita

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
- **Hard skip rules** to avoid low-quality trades

The philosophy is simple:

> **Skip low-quality setups. Only take high-conviction trades.**

## Current Baseline
Current official baseline:

**Pochita v1.1 Gold**

Main rules:
- Minimum conviction: **75**
- Buy pressure UP: **>= 55**
- Buy pressure DOWN: **<= 45**
- AI prediction must align with rule bias
- Hard skip rules stay active

Recorded result from the current baseline:
- **Total Trades:** 152
- **Correct:** 122
- **Wrong:** 30
- **Skipped:** 280
- **Win Rate:** **80.26%**

## Repository Notes
This version is sanitized for sharing:
- no hardcoded API key
- no local logs/state files
- no local `.git` history
- no `node_modules`

## Environment Variables
Create a `.env` file based on `.env.example`:

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

## Important Files
- `scripts/ai-analyze.js` → main trading logic
- `scripts/auto-loop.js` → loop runner
- `scripts/finalize-v2.js` → batch finalization
- `POCHITA_STRATEGY_SPEC_V1.md` → strategy blueprint
- `SKILL.md` → skill packaging notes

## Disclaimer
This project is experimental and intended for research, testing, and automation workflows.
Do your own validation before using it in live trading environments.

*Built with ❤️ by Reze Agent*
