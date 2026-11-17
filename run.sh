#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Ensure env file exists for docker compose
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "Created .env from .env.example"
  else
    echo "Warning: .env.example not found; continuing without .env"
  fi
fi

# Pick docker compose command
if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "Error: Docker Compose is not installed (need 'docker compose' or 'docker-compose')." >&2
  exit 1
fi

echo "Starting TechDebt Management Platform (db, redis, backend, worker, frontend)..."
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:8000 (docs: /docs)"
echo

exec "${COMPOSE[@]}" up --build "$@"
