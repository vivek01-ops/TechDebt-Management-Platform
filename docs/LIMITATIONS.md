# Known Limitations & Coverage Notes

## Discovery breadth
- Dedicated, deeply enriched Boto3 collectors are implemented for key services: EC2 (instances/volumes), RDS (instances/clusters), Lambda, S3, ECS, EKS, DynamoDB, ElastiCache.
- The platform includes an adapter framework and a seeded coverage catalog for many additional AWS resource types across compute, database, storage, networking, containers, security, integration, analytics, developer, monitoring, and AI families. Resource types without dedicated enrichment are represented as generic/planned/discovery-only in the Collector Coverage matrix and must not be treated as fully assessed.
- Full "all discoverable resource types" coverage requires enabling AWS Resource Explorer 2 indexing/views and/or AWS Config (including aggregators) and implementing/expanding service-specific adapters. These integrations are architected and permission-documented; availability depends on account configuration and IAM access.

## Account/region/permissions
- Cross-account and Organizations discovery depend on provided roles/permissions. AccessDenied, throttling, opt-in regions, and service unavailability are captured as collection errors and reflected in coverage/diagnostics.
- AWS Health lifecycle APIs and some capabilities require specific subscriptions/eligibility and permissions; adapters must handle graceful degradation.

## Software inventory
- In-guest OS/package/runtime discovery primarily depends on AWS Systems Manager Inventory and managed node coverage. Unmanaged EC2 instances are reported as incomplete/unmanaged, not healthy.
- Container image/SBOM/Kubernetes workload inventory (ECR, ECS/EKS, Syft, Trivy) is modelled and integration-ready but requires configured access/tools and cluster RBAC; not all environments will have complete visibility.

## Lifecycle matching
- endoflife.date API v1 sync is implemented (real HTTP integration). AWS Health and vendor official source adapters are extensible; source precedence and conflict handling are designed to avoid silent overwrites.
- Matching relies on available version/technology identifiers (e.g. RDS engine versions, Lambda runtimes, known mappings). Ambiguous/no-match/insufficient data states are surfaced; dates are never fabricated. Approximate-date precision is preserved.

## Operational notes
- Background scheduling via Celery is scaffolded; local/dev can trigger scans/sync/recompute on-demand via API/UI.
- Successful authoritative reconciliation is required before marking resources missing; failed runs preserve last known inventory.
- Security: read-only AWS access, least privilege, no plaintext secrets stored, no infrastructure modifications.

This implementation provides a functional, extensible end-to-end foundation aligned with the specified product vision, with transparent reporting of gaps and prerequisites.
