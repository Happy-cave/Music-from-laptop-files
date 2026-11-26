#!/usr/bin/env sh
# Stops Snowtune cleanly (macOS / Linux).
if curl -fsS -X POST "http://127.0.0.1:${SNOWTUNE_PORT:-8765}/api/shutdown" >/dev/null 2>&1; then
  echo "Snowtune stopped."
else
  echo "Snowtune was not running."
fi
