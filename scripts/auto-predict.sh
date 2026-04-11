#!/bin/bash

# Auto Predict Script for Polymarket BTC 5m
# Calculates the most recent 5-minute slot URL and runs prediction

BASE_URL="https://polymarket.com/event/btc-updown-5m-"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="/home/zaluk/.openclaw/workspace"
LOG_FILE="$WORKSPACE_DIR/logs/auto-predict.log"

mkdir -p "$WORKSPACE_DIR/logs"

# Get current UTC timestamp in seconds
NOW=$(date -u +%s)

# Calculate the start of the current 5-minute slot (rounded down)
# 5 minutes = 300 seconds
SLOT_START=$(( (NOW / 300) * 300 ))

# Construct URL
URL="${BASE_URL}${SLOT_START}"

echo "[$(date)] Processing: $URL" >> "$LOG_FILE"

# Run the prediction using run-market.js
# We use the absolute path to node and script to avoid cron environment issues
cd "$SCRIPT_DIR"
node "$SCRIPT_DIR/run-market.js" "$URL" predict >> "$LOG_FILE" 2>&1

echo "[$(date)] Done." >> "$LOG_FILE"
