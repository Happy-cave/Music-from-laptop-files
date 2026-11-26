#!/usr/bin/env sh
# Opens Snowtune in its own window (macOS / Linux). Closing the window stops it.
cd "$(dirname "$0")" || exit 1
command -v python3 >/dev/null 2>&1 || { echo "Snowtune needs Python 3.9 or newer (python3)."; exit 1; }
nohup python3 Snowtune.pyw >/dev/null 2>&1 &
