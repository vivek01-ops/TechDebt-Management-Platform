from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_

from app.db.session import get_db
from app.models.inventory import AwsResource, AwsAccount

router = APIRouter()


@router.get("")
def list_resources(
    q: str | None = None,
    service: str | None = None,
    region: str | None = None,
    state: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = select(AwsResource)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(AwsResource.name.ilike(like), AwsResource.resource_id.ilike(like), AwsResource.arn.ilike(like), AwsResource.resource_type.ilike(like)))
    if service:
        stmt = stmt.where(AwsResource.service == service)
    if region:
        stmt = stmt.where(AwsResource.region == region)
    if state:
        stmt = stmt.where(AwsResource.normalized_state == state)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = db.scalars(stmt.order_by(AwsResource.last_seen_at.desc()).offset(offset).limit(limit)).all()
    # preload account ids map simply
    acc_ids = {i.account_id_fk for i in items}
    accounts = {a.id: a for a in db.scalars(select(AwsAccount).where(AwsAccount.id.in_(acc_ids))).all()} if acc_ids else {}
    return {
        "items": [
            {
                "id": r.id,
                "account_id": accounts.get(r.account_id_fk).account_id if accounts.get(r.account_id_fk) else None,
                "account_name": accounts.get(r.account_id_fk).account_name if accounts.get(r.account_id_fk) else None,
                "region": r.region,
                "service": r.service,
                "resource_type": r.resource_type,
                "resource_id": r.resource_id,
                "arn": r.arn,
                "name": r.name,
                "normalized_state": r.normalized_state,
                "original_state": r.original_state,
                "version_info": r.version_info,
                "discovery_source": r.discovery_source,
                "enrichment_status": r.enrichment_status,
                "last_seen_at": r.last_seen_at,
            }
            for r in items
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/{resource_id}")
def get_resource(resource_id: int, db: Session = Depends(get_db)):
    r = db.get(AwsResource, resource_id)
    if not r:
        return {"error": "not found"}
    account = db.get(AwsAccount, r.account_id_fk)
    return {
        "id": r.id,
        "account": {"id": account.id, "account_id": account.account_id, "account_name": account.account_name} if account else None,
        "region": r.region,
        "service": r.service,
        "resource_type": r.resource_type,
        "resource_id": r.resource_id,
        "arn": r.arn,
        "name": r.name,
        "normalized_state": r.normalized_state,
        "original_state": r.original_state,
        "version_info": r.version_info,
        "technology_identifiers": r.technology_identifiers,
        "tags": [{"key": t.key, "value": t.value} for t in r.tags],
        "raw_metadata": r.raw_metadata,
        "discovery_source": r.discovery_source,
        "enrichment_status": r.enrichment_status,
        "data_completeness": r.data_completeness,
        "last_seen_at": r.last_seen_at,
        "software_installations": [
            {"id": s.id, "name": s.name, "version": s.version, "source": s.source, "confidence": s.confidence}
            for s in r.software_installations
        ],
    }

