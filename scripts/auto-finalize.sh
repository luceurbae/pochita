#!/bin/bash

# Auto Finalize Script for Polymarket BTC 5m
# Checks pending markets in backtest.txt and updates their results

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="/home/zaluk/.openclaw/workspace"
BACKTEST_FILE="$WORKSPACE_DIR/backtest.txt"
LOG_FILE="$WORKSPACE_DIR/logs/auto-finalize.log"

mkdir -p "$WORKSPACE_DIR/logs"

echo "[$(date)] Starting Finalization Cycle..." >> "$LOG_FILE"

# Read all PENDING lines from backtest.txt
grep "PENDING" "$BACKTEST_FILE" | while IFS= read -r line; do
    # Extract URL from the line (usually at the end after :: or as the last URL)
    URL=$(echo "$line" | grep -o 'https://polymarket.com/event/btc-updown-5m-[0-9]*')
    
    if [ -z "$URL" ]; then
        continue
    fi

    echo "[$(date)] Finalizing: $URL" >> "$LOG_FILE"
    
    # Run update-from-final.js
    # Note: We use the root workspace run-market.js or the one in scripts
    cd "$SCRIPT_DIR"
    RESULT=$(node "$SCRIPT_DIR/run-market.js" "$URL" finalize 2>&1)
    
    echo "[$(date)] Result for $URL: $RESULT" >> "$LOG_FILE"
done

echo "[$(date)] Finalization Cycle Complete." >> "$LOG_FILE"
