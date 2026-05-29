#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

(
  cd "$ROOT_DIR"
  ./.venv/bin/activate
  python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
) &

(
  cd "$ROOT_DIR/frontend"
  npm run dev -- --host 127.0.0.1 --port 5173
) &

wait