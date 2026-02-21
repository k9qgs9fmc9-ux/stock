#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

stop_job() {
  local pid_file="$1"
  if [ -f "$pid_file" ]; then
    pid=$(cat "$pid_file")
    if ps -p "$pid" > /dev/null 2>&1; then
      echo "Stopping pid $pid..."
      kill "$pid" || true
    fi
  fi
}

stop_job "$BACKEND_DIR/backend.pid"
stop_job "$FRONTEND_DIR/frontend.pid"
rm -f "$BACKEND_DIR/backend.pid" "$FRONTEND_DIR/frontend.pid" || true
echo "Stopped."
