from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.inventory import AwsAccount, AwsResource
from app.models.lifecycle import ResourceLifecycleMatch
from app.models.operations import CollectorCoverage, CollectionRun

router = APIRouter()


@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    total_accounts = db.scalar(select(func.count()).select_from(AwsAccount)) or 0
    scanned_accounts = db.scalar(select(func.count()).select_from(AwsAccount).where(AwsAccount.last_connection_status == "connected")) or 0
    total_resources = db.scalar(select(func.count()).select_from(AwsResource)) or 0
    running_resources = db.scalar(select(func.count()).select_from(AwsResource).where(AwsResource.normalized_state == "Running")) or 0
    # lifecycle-based metrics from matches if present
    approaching_eos = db.scalar(select(func.count()).select_from(ResourceLifecycleMatch).where(ResourceLifecycleMatch.days_to_eos != None, ResourceLifecycleMatch.days_to_eos >= 0, ResourceLifecycleMatch.days_to_eos <= 90)) or 0
    approaching_eol = db.scalar(select(func.count()).select_from(ResourceLifecycleMatch).where(ResourceLifecycleMatch.days_to_eol != None, ResourceLifecycleMatch.days_to_eol >= 0, ResourceLifecycleMatch.days_to_eol <= 90)) or 0
    unsupported = db.scalar(select(func.count()).select_from(ResourceLifecycleMatch).where((ResourceLifecycleMatch.days_to_eol != None) & (ResourceLifecycleMatch.days_to_eol < 0))) or 0
    unknown_lifecycle = db.scalar(select(func.count()).select_from(ResourceLifecycleMatch).where(ResourceLifecycleMatch.match_status.in_(["no_match", "unknown", "insufficient", "ambiguous"]))) or 0
    coverage_total = db.scalar(select(func.count()).select_from(CollectorCoverage)) or 0
    coverage_supported = db.scalar(select(func.count()).select_from(CollectorCoverage).where(CollectorCoverage.coverage_status == "Fully Supported")) or 0
    last_run = db.scalar(select(CollectionRun).order_by(CollectionRun.started_at.desc()))
    return {
        "total_accounts": total_accounts,
        "scanned_accounts": scanned_accounts,
        "total_resources": total_resources,
        "running_resources": running_resources,
        "outdated_technologies": unsupported + approaching_eol + approaching_eos,
        "approaching_eos": approaching_eos,
        "approaching_eol": approaching_eol,
        "unsupported": unsupported,
        "unknown_lifecycle": unknown_lifecycle,
        "collection_coverage": {
            "total_adapters": coverage_total,
            "fully_supported": coverage_supported,
            "percent": round((coverage_supported / coverage_total * 100), 1) if coverage_total else 0,
        },
        "last_collection": {
            "id": last_run.id if last_run else None,
            "status": last_run.status if last_run else None,
            "started_at": last_run.started_at if last_run else None,
            "summary": last_run.summary if last_run else None,
        },
    }

