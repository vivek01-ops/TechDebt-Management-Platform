from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.lifecycle import LifecycleProduct, LifecycleRelease, LifecycleEvent, LifecycleSource
from app.lifecycle.service import sync_endoflife_products
from app.lifecycle.matching import recompute_all_matches
from app.models.lifecycle import ResourceLifecycleMatch
from app.models.inventory import AwsResource, AwsAccount

router = APIRouter()


@router.post("/sync/endoflife")
async def sync_endoflife(limit: int | None = Query(default=50, ge=1, le=500), db: Session = Depends(get_db)):
    result = await sync_endoflife_products(db, limit=limit)
    return result


@router.get("/sources")
def list_sources(db: Session = Depends(get_db)):
    items = db.scalars(select(LifecycleSource).order_by(LifecycleSource.precedence.desc())).all()
    return {"items": [{"id": s.id, "name": s.name, "kind": s.kind, "enabled": s.enabled, "last_sync_at": s.last_sync_at, "last_status": s.last_status, "last_error": s.last_error} for s in items], "total": len(items)}


@router.get("/products")
def list_products(q: str | None = None, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    stmt = select(LifecycleProduct)
    if q:
        stmt = stmt.where(LifecycleProduct.product_slug.ilike(f"%{q}%") | LifecycleProduct.title.ilike(f"%{q}%"))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = db.scalars(stmt.order_by(LifecycleProduct.title).offset(offset).limit(limit)).all()
    return {
        "items": [
            {
                "id": p.id,
                "slug": p.product_slug,
                "title": p.title,
                "vendor": p.vendor,
                "source_id": p.source_id_fk,
                "aliases": p.aliases or [],
            }
            for p in items
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    p = db.get(LifecycleProduct, product_id)
    if not p:
        return {"error": "not found"}
    releases = db.scalars(select(LifecycleRelease).where(LifecycleRelease.product_id_fk == p.id).order_by(LifecycleRelease.cycle.desc())).all()
    out_releases = []
    for r in releases:
        events = db.scalars(select(LifecycleEvent).where(LifecycleEvent.release_id_fk == r.id)).all()
        out_releases.append({
            "id": r.id,
            "cycle": r.cycle,
            "release_date": r.release_date,
            "latest_version": r.latest_version,
            "lts": r.lts,
            "events": [{"milestone_type": e.milestone_type, "event_date": e.event_date, "date_precision": e.date_precision, "is_approximate": e.is_approximate} for e in events],
        })
    return {"id": p.id, "slug": p.product_slug, "title": p.title, "releases": out_releases}


@router.post("/recompute-matches")
def recompute_matches(db: Session = Depends(get_db)):
    return recompute_all_matches(db)


@router.get("/watchlist")
def watchlist(limit: int = 200, db: Session = Depends(get_db)):
    stmt = select(ResourceLifecycleMatch).order_by(ResourceLifecycleMatch.days_to_eol.asc().nullslast(), ResourceLifecycleMatch.days_to_eos.asc().nullslast()).limit(limit)
    items = db.scalars(stmt).all()
    out = []
    for m in items:
        r = db.get(AwsResource, m.resource_id_fk)
        acct = db.get(AwsAccount, r.account_id_fk) if r else None
        eos_date = eol_date = None
        if m.release_id_fk:
            evs = db.scalars(select(LifecycleEvent).where(LifecycleEvent.release_id_fk == m.release_id_fk)).all()
            for e in evs:
                if e.milestone_type == 'eos': eos_date = e.event_date
                if e.milestone_type == 'eol': eol_date = e.event_date
        out.append({
            "match_id": m.id,
            "resource_id": r.id if r else None,
            "resource_name": (r.name or r.resource_id) if r else None,
            "service": r.service if r else None,
            "resource_type": r.resource_type if r else None,
            "technology": m.technology_name,
            "installed_version": m.matched_version,
            "account_id": acct.account_id if acct else None,
            "account_name": acct.account_name if acct else None,
            "region": r.region if r else None,
            "eos_date": eos_date,
            "eos_days_remaining": m.days_to_eos,
            "eos_state": m.eos_state,
            "eol_date": eol_date,
            "eol_days_remaining": m.days_to_eol,
            "eol_state": m.eol_state,
            "risk": ("Critical" if (m.days_to_eol is not None and m.days_to_eol < 0) or (m.days_to_eol is not None and m.days_to_eol <= 30) or (m.days_to_eos is not None and m.days_to_eos < 0) else "High" if (m.days_to_eol is not None and m.days_to_eol <= 90) or (m.days_to_eos is not None and m.days_to_eos <= 90) else "Medium" if (m.days_to_eol is not None and m.days_to_eol <= 180) or (m.days_to_eos is not None and m.days_to_eos <= 180) else "Low" if m.days_to_eol is not None or m.days_to_eos is not None else "Unknown"),
            "match_status": m.match_status,
            "lifecycle_source": m.selected_source,
            "reason": m.match_reason,
        })
    return {"items": out, "total": len(out)}


