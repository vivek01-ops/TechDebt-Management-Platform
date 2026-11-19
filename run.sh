#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed or not in PATH." >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "Error: Docker Compose is not available (need 'docker compose' or 'docker-compose')." >&2
  exit 1
fi

# Pull the latest images defined in docker-compose.yml (will skip if not image-based)
echo "Pulling Docker images..."
docker compose pull 2>/dev/null || true

# If any services still use build, we cannot pull; inform the user.
# For image-based services (postgres, redis, and any with :tag), they are now pulled.

echo "Starting containers..."
exec "${COMPOSE[@]}" up "$@"