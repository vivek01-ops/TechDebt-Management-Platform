# TechDebt Management Platform

AWS-focused Technology Lifecycle, Inventory & Technical Debt Intelligence platform.

## Overview
TechDebt Management Platform discovers AWS resources across accounts and regions, identifies technologies and versions, correlates them with lifecycle data (EOS/EOL and other milestones), calculates remaining days, and surfaces technical debt risk, ownership, remediation, and collection coverage.

## Architecture
- **Modular monolith** with independently executable background workers (Celery + Redis)
- **Backend:** Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, Boto3/Botocore, HTTPX
- **Frontend:** React + TypeScript + Vite, Tailwind CSS, TanStack Query/Table-ready, React Router, Apache ECharts
- **Database:** PostgreSQL
- **Local-first, cloud-ready:** Docker Compose for local dev; stateless API/workers, externalized config

### Key subsystems
- **AWS Discovery & Collection Framework:** adapter-based collectors (dedicated Boto3 enrichment + generic discovery), normalized resource model, account/region orchestration, retries/pagination/error classification, coverage registry
- **Software Inventory:** SSM Inventory integration points, EC2/container/Kubernetes inventory model (SBOM via Syft/Trivy integration-ready)
- **Lifecycle Intelligence:** endoflife.date API v1 integration (implemented), AWS Health and vendor source adapter framework, normalized milestones, source precedence, match confidence
- **Matching & Countdown Engine:** maps resources/installations to lifecycle releases, independent EOS/EOL day calculations (UTC calendar days), states (upcoming/due today/overdue/unknown/not applicable)
- **Risk & Remediation:** configurable risk bands, explainable assessments, remediation workflow (read-only for AWS infra)
- **Dashboard:** enterprise dark-first UI connected to real backend APIs

## Repository structure
- `backend/` – FastAPI app, collectors, lifecycle engine, DB models, workers, tests
- `frontend/` – React dashboard
- `docs/` – architecture and operational documentation
- `docker-compose.yml` – local stack (Postgres, Redis, backend, worker, frontend)
- `.env.example` – configuration template

## Prerequisites
- Docker & Docker Compose (recommended), or Python 3.12+/Node 24+ for local dev
- AWS credentials/profile/role with **read-only** permissions (standard AWS credential chain)
- Optional: AWS Resource Explorer 2, AWS Config/Aggregators, Systems Manager Inventory, AWS Health API access (permissions-dependent)

## Quick start (Docker Compose)
1. Copy env: `cp .env.example .env` and adjust if needed
2. Start stack: `docker compose up --build`
3. Backend API: http://localhost:8000 (health: `/health`, docs: `/docs`)
4. Frontend: http://localhost:5173

Database tables are auto-created in development startup for convenience; Alembic scaffolding is included for migrations (`backend/alembic`).

## Local development (without Docker)
### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e .[dev]
export DATABASE_URL=postgresql+psycopg://techdebt:techdebt@localhost:5432/techdebt
python -m app.db.init_db
uvicorn app.main:app --reload
```
### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Initial workflow
1. **AWS login from portal:** Open **AWS Account Management** and sign in from the portal using **Access Key ID** and **Secret Access Key** (optional session token for temporary credentials). Test connection, then save the account.
2. **Connect & discover:** Click **Connect** (or `POST /api/v1/accounts/{id}/connect`) to validate identity and discover enabled regions.
3. **Run inventory scan:** Click **Scan** or `POST /api/v1/collections/scan/{id}`. Discovers resources via implemented adapters and stores normalized inventory.
4. **Sync lifecycle catalog:** `POST /api/v1/lifecycle/sync/endoflife?limit=50` (real endoflife.date API v1) or use the Lifecycle page action.
5. **Recompute lifecycle matches/countdowns:** `POST /api/v1/lifecycle/recompute-matches` or Watchlist "Recompute Matches".
6. **Review:** Executive Overview, Resource Inventory, EOS/EOL Watchlist, Collector Coverage, Collection History

## AWS discovery coverage
- **Implemented dedicated collectors (real Boto3, paginated, error-handled):** EC2 (instances/volumes), RDS (instances/clusters), Lambda (functions/runtimes), S3 (buckets), ECS (clusters/services)
- **Coverage registry:** tracks adapter status/support/limitations per service/resource type; UI shows real coverage and collection errors
- **Extensible framework:** standardized adapter contract and registry for broad AWS resource-type discovery/enrichment (Resource Explorer 2, AWS Config, Organizations, SSM, service APIs). Unsupported/unconfigured capabilities are reported as unavailable/permission-missing/partial rather than fabricated.

## Lifecycle data & matching
- **endoflife.date API v1:** implemented sync for products/releases/events (EOS/EOL/extended support fields where available)
- **Source precedence (configurable):** AWS official > vendor > endoflife.date > other verified; conflicts not silently overwritten
- **Countdown:** `Days Remaining = Milestone Date - Current UTC Date`; states upcoming/due today/overdue/unknown/not applicable; approximate dates preserved
- **Matching:** version normalization and product mapping for managed runtimes/engines and software installations with confidence/status (exact/strong/partial/ambiguous/no match/unsupported/insufficient)

## Security
- Read-only AWS integrations; no infrastructure modifications
- Least-privilege IAM policy template: `docs/iam-policy-readonly.json`
- Portal-based AWS login using Access Key ID / Secret Access Key (and optional session token) for account-scoped discovery; use least-privilege, preferably temporary credentials. Credentials are used for AWS API access and should be protected according to your deployment security controls.
- Sensitive values not logged in application logs; inputs validated; external lifecycle data treated as data only
- For production deployments, prefer short-lived credentials/AssumeRole with secret management and encryption-at-rest aligned to your security policies.

## Testing
```bash
cd backend
pytest
```
Includes unit tests for countdown/risk/normalization and collector/lifecycle logic foundations. Frontend: `npm test`/component tests can be added per environment.

## Known limitations
- Some AWS services/APIs require specific opt-ins, regional availability, or permissions (Config, Resource Explorer indexing, AWS Health subscription/eligibility, SSM Inventory, EKS Kubernetes API/RBAC). Missing access is surfaced in diagnostics/coverage.
- Not all listed AWS resource types have dedicated deep-enrichment adapters in this build; the framework and registry are designed for comprehensive expansion, and discovered/unsupported items must be reported transparently.
- Software-in-guest and SBOM/image scanning depend on configured SSM/registry/cluster access and tools (Syft/Trivy).

## Documentation
See `docs/` for architecture, discovery design, IAM setup, lifecycle/matching rules, database design, API, troubleshooting, and cloud deployment considerations.
# TechDebt-Management-Platform
# TechDebt-Management-Platform
# TechDebt-Management-Platform
