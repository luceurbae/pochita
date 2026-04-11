#!/bin/bash

SCRIPT="/home/zaluk/.openclaw/workspace/skills/pochita/scripts/auto-loop.js"
PID_FILE="/home/zaluk/.openclaw/workspace/auto-loop.pid"
LOG_FILE="/home/zaluk/.openclaw/workspace/logs/auto-loop.log"

mkdir -p /home/zaluk/.openclaw/workspace/logs

case "$1" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
      echo "✅ Loop sudah berjalan (PID: $(cat $PID_FILE))"
    else
      echo "🔄 Memulai auto backtest loop..."
      nohup node "$SCRIPT" loop > "$LOG_FILE" 2>&1 &
      echo $! > "$PID_FILE"
      echo "✅ Loop dimulai (PID: $(cat $PID_FILE))"
      echo "   Log: $LOG_FILE"
    fi
    ;;
  
  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if kill -0 "$PID" 2>/dev/null; then
        echo "⏹️  Menghentikan loop (PID: $PID)..."
        kill "$PID"
        rm "$PID_FILE"
        echo "✅ Loop dihentikan"
      else
        echo "⚠️  Process tidak ditemukan, membersihkan PID file"
        rm "$PID_FILE"
      fi
    else
      echo "⚠️  PID file tidak ditemukan"
    fi
    ;;
  
  status)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if kill -0 "$PID" 2>/dev/null; then
        echo "✅ Loop berjalan (PID: $PID)"
        echo ""
        echo "📊 5 entry terakhir log:"
        tail -5 "$LOG_FILE"
      else
        echo "⚠️  PID file ada tapi process tidak berjalan (stale PID)"
      fi
    else
      echo "❌ Loop tidak berjalan"
    fi
    ;;
  
  restart)
    bash "$0" stop
    sleep 2
    bash "$0" start
    ;;
  
  logs)
    if [ -f "$LOG_FILE" ]; then
      tail -20 "$LOG_FILE"
    else
      echo "❌ Log file tidak ditemukan"
    fi
    ;;
  
  *)
    echo "Usage: $0 {start|stop|status|restart|logs}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the 5-minute backtest loop"
    echo "  stop    - Stop the loop"
    echo "  status  - Check if loop is running"
    echo "  restart - Restart the loop"
    echo "  logs    - Show last 20 lines of log"
    exit 1
    ;;
esac
