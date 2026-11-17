# Architecture

## Goals
- Comprehensive AWS resource discovery and enrichment across accounts/regions
- Real lifecycle intelligence (EOS/EOL/extended) with independent countdowns
- Persistent normalized inventory, historical snapshots, and remediation tracking
- Honest coverage and diagnostics; no fabricated data

## Components
- **API (FastAPI):** REST endpoints for accounts, inventory, lifecycle, watchlist, dashboard, collections, remediation, settings
- **Collectors:** Adapter framework + registry. Each adapter declares discovery/enrichment/version/state/tag/timestamp capabilities, permissions, pagination, and coverage. Dedicated Boto3 collectors for key services; extensible to Resource Explorer 2, AWS Config, Organizations, SSM, ECR/EKS, AWS Health, etc.
- **Lifecycle Engine:** Source adapters (endoflife.date implemented), normalization, product/release/event catalog, matching with confidence, countdown computation (UTC calendar days)
- **Workers (Celery/Redis):** scheduled and on-demand scans, sync, recalculation, snapshots
- **Database (PostgreSQL):** normalized entities for accounts/resources/software/lifecycle/matches/ownership/risk/remediation/collections/coverage/history
- **Frontend (React):** enterprise dashboard consuming real APIs

## Data flow
1. Account connect + region discovery (STS/EC2 describe-regions)
2. Collection runs invoke adapters per region/service -> normalized resources -> upsert/idempotent persistence
3. Lifecycle sync ingests sources -> normalized catalog
4. Matching links resource/software versions to releases -> countdowns and risk inputs
5. Dashboard/Watchlist query persisted, computed data

## Coverage principles
- Never claim 100% if mechanisms cannot guarantee it
- Distinguish discovered vs enriched vs lifecycle-assessed
- Preserve last successful inventory on failed runs; missing only after successful authoritative reconciliation
- Report permission gaps, throttling, unsupported APIs clearly
