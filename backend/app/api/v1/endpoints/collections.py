from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.db.session import get_db
from app.models.inventory import AwsAccount
from app.models.operations import CollectionRun, CollectionJob, CollectorCoverage, CollectionError
from app.services.discovery import run_account_scan, ensure_coverage_registry

router = APIRouter()


@router.get("/jobs")
def list_jobs(db: Session = Depends(get_db)):
    items = db.scalars(select(CollectionJob).order_by(desc(CollectionJob.created_at)).limit(100)).all()
    return {"items": [{"id": j.id, "job_type": j.job_type, "status": j.status, "scope": j.scope, "created_at": j.created_at} for j in items], "total": len(items)}


@router.get("/runs")
def list_runs(db: Session = Depends(get_db)):
    items = db.scalars(select(CollectionRun).order_by(desc(CollectionRun.started_at)).limit(100)).all()
    return {"items": [{"id": r.id, "job_id": r.job_id_fk, "account_id": r.account_id_fk, "status": r.status, "started_at": r.started_at, "completed_at": r.completed_at, "summary": r.summary, "error_message": r.error_message} for r in items], "total": len(items)}


@router.get("/errors")
def list_errors(db: Session = Depends(get_db)):
    items = db.scalars(select(CollectionError).order_by(desc(CollectionError.occurred_at)).limit(200)).all()
    return {"items": [{"id": e.id, "run_id": e.run_id_fk, "account_id": e.account_id_fk, "region": e.region, "service": e.service, "resource_type": e.resource_type, "error_type": e.error_type, "message": e.message, "occurred_at": e.occurred_at} for e in items], "total": len(items)}


@router.get("/coverage")
def coverage(db: Session = Depends(get_db)):
    ensure_coverage_registry(db)
    items = db.scalars(select(CollectorCoverage).order_by(CollectorCoverage.aws_service, CollectorCoverage.resource_type)).all()
    return {"items": [{"aws_service": c.aws_service, "resource_type": c.resource_type, "discovery_source": c.discovery_source, "adapter_status": c.adapter_status, "enrichment_support": c.enrichment_support, "version_support": c.version_support, "coverage_status": c.coverage_status, "last_collection_at": c.last_collection_at, "test_status": c.test_status, "known_limitations": c.known_limitations} for c in items], "total": len(items)}


@router.post("/scan/{account_id}")
def scan_account(account_id: int, db: Session = Depends(get_db)):
    account = db.get(AwsAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    try:
        return run_account_scan(db, account)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

