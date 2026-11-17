# Setup & Operations

## Prerequisites
- Docker + Docker Compose, or local Python 3.12+/Node 24+ and PostgreSQL/Redis
- AWS credentials via standard provider chain (env vars, shared config/profile, SSO, instance role, etc.)
- Read-only IAM permissions (see `docs/iam-policy-readonly.json`)

## Configuration
Copy `.env.example` to `.env`. Key variables:
- `DATABASE_URL`, `REDIS_URL`
- `AWS_PROFILE`, `AWS_REGION`, `AWS_ASSUME_ROLE_ARN`, `AWS_EXTERNAL_ID` (optional defaults)
- `ENDOFLIFE_API_BASE=https://endoflife.date/api/v1`

## Docker Compose
```bash
docker compose up --build
```
Services: db (5432), redis (6379), backend (8000), worker, frontend (5173).

## Database initialization
Development mode auto-creates tables on startup (best-effort). Explicit init:
```bash
cd backend
python -m app.db.init_db
```
Alembic is scaffolded in `backend/alembic` for migrations.

## End-to-end workflow
1. Open UI at http://localhost:5173
2. Register/connect AWS account (profile or role). Regions discovered dynamically.
3. Run scan for account -> resources persisted, collection run/errors/coverage recorded.
4. Sync lifecycle catalog from endoflife.date (real API v1).
5. Recompute lifecycle matches/countdowns.
6. Review Executive Overview and EOS/EOL Watchlist.

## API examples
- `GET /api/v1/dashboard/overview`
- `POST /api/v1/accounts` `{ "account_name": "prod", "profile_name": "default" }`
- `POST /api/v1/accounts/{id}/connect`
- `POST /api/v1/collections/scan/{id}`
- `POST /api/v1/lifecycle/sync/endoflife?limit=50`
- `POST /api/v1/lifecycle/recompute-matches`
- `GET /api/v1/lifecycle/watchlist`

## Testing
```bash
cd backend
PYTHONPATH=. pytest
```
(Requires dev dependencies installed.)
