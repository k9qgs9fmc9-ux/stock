#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "Starting backend..."
(
  cd "$BACKEND_DIR"
  if [ ! -d "venv" ]; then
    python3 -m venv venv
  fi
  source venv/bin/activate
  if ! python -c "import fastapi" >/dev/null 2>&1; then
    pip install fastapi uvicorn akshare pydantic python-dotenv openai pypinyin
  fi
  uvicorn app:app --reload --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
  echo $! > backend.pid
)

echo "Starting frontend..."
(
  cd "$FRONTEND_DIR"
  npm install --silent
  if [ -x "./node_modules/.bin/vite" ]; then
    npm run dev > ../frontend.log 2>&1 &
  else
    npx vite > ../frontend.log 2>&1 &
  fi
  echo $! > ../frontend.pid
)

echo "All services started."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "Logs: backend.log | frontend.log"

echo ""
echo "To stop services, run: scripts/stop_servers.sh"
