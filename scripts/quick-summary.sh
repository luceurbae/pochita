#!/bin/bash

BACKTEST_FILE="/home/zaluk/.openclaw/workspace/backtest.txt"

if [ ! -f "$BACKTEST_FILE" ]; then
  echo "❌ backtest.txt tidak ditemukan"
  exit 1
fi

echo "📊 POLYMARKET BTC 5M BACKTEST SUMMARY"
echo "====================================="
echo ""

# Total entries
TOTAL=$(grep -v "^#" "$BACKTEST_FILE" | grep -v "^$" | wc -l)
echo "📈 Total Entries: $TOTAL"

# PENDING
PENDING=$(grep -v "^#" "$BACKTEST_FILE" | grep -v "^$" | grep "PENDING" | wc -l)
echo "⏳ Pending: $PENDING"

# FINALIZED
FINALIZED=$(grep -v "^#" "$BACKTEST_FILE" | grep -v "^$" | grep -v "PENDING" | wc -l)
echo "✅ Finalized: $FINALIZED"

# CORRECT
CORRECT=$(grep -v "^#" "$BACKTEST_FILE" | grep -v "^$" | grep "CORRECT" | wc -l)
echo "✔️  Correct: $CORRECT"

# WRONG
WRONG=$(grep -v "^#" "$BACKTEST_FILE" | grep -v "^$" | grep "WRONG" | wc -l)
echo "❌ Wrong: $WRONG"

# Win rate
if [ $FINALIZED -gt 0 ]; then
  WIN_RATE=$(echo "scale=2; $CORRECT * 100 / $FINALIZED" | bc)
  echo ""
  echo "🎯 Win Rate: ${WIN_RATE}% ($CORRECT/$FINALIZED)"
fi

# Last 5 entries
echo ""
echo "📋 5 Entry Terakhir:"
echo "-------------------"
tail -5 "$BACKTEST_FILE" | grep -v "^#" | grep -v "^$" | while IFS= read -r line; do
  # Parse line
  TIMESTAMP=$(echo "$line" | cut -d'|' -f1 | xargs)
  PREDICTION=$(echo "$line" | cut -d'|' -f6 | xargs)
  CONFIDENCE=$(echo "$line" | cut -d'|' -f7 | xargs)
  RESULT=$(echo "$line" | cut -d'|' -f8 | xargs)
  URL=$(echo "$line" | cut -d'|' -f9 | xargs | cut -d' ' -f1)
  
  echo "⏰ $TIMESTAMP"
  echo "   Prediction: $PREDICTION ($CONFIDENCE) → $RESULT"
  echo "   URL: $URL"
  echo ""
done
