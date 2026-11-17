from __future__ import annotations
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.lifecycle.sources.endoflife import EndOfLifeDateClient, parse_date
from app.models.lifecycle import LifecycleSource, LifecycleProduct, LifecycleRelease, LifecycleEvent


async def sync_endoflife_products(db: Session, limit: int | None = None) -> dict:
    client = EndOfLifeDateClient()
    source = db.scalar(select(LifecycleSource).where(LifecycleSource.name == "endoflife.date"))
    if not source:
        source = LifecycleSource(name="endoflife.date", kind="endoflife", base_url=client.base_url, precedence=30)
        db.add(source)
        db.flush()
    products = await client.list_products()
    if limit:
        products = products[:limit]
    synced = 0
    errors = 0
    for p in products:
        slug = p.get("name") or p.get("product") or p.get("slug")
        if not slug:
            continue
        try:
            detail = await client.get_product(slug)
            # detail may be product object or have releases/cycles
            title = detail.get("label") or detail.get("title") or slug
            aliases = detail.get("aliases") or []
            lp = db.scalar(select(LifecycleProduct).where(LifecycleProduct.source_id_fk == source.id, LifecycleProduct.product_slug == slug))
            if not lp:
                lp = LifecycleProduct(source_id_fk=source.id, product_slug=slug, title=title, aliases=aliases)
                db.add(lp)
                db.flush()
            else:
                lp.title = title
                lp.aliases = aliases
            releases = detail.get("releases") or detail.get("result") or []
            # some v1 responses return list of cycles directly
            if isinstance(releases, dict):
                releases = releases.get("releases", [])
            if not isinstance(releases, list):
                releases = []
            for r in releases:
                cycle = str(r.get("cycle") or r.get("releaseCycle") or r.get("name") or "").strip()
                if not cycle:
                    continue
                lr = db.scalar(select(LifecycleRelease).where(LifecycleRelease.product_id_fk == lp.id, LifecycleRelease.cycle == cycle))
                if not lr:
                    lr = LifecycleRelease(product_id_fk=lp.id, cycle=cycle)
                    db.add(lr)
                    db.flush()
                # dates/fields
                rel_date = parse_date(r.get("releaseDate"))
                lr.release_date = rel_date[0] if rel_date else None
                lr.latest_version = r.get("latest") or r.get("latestRelease")
                lts = r.get("lts")
                lr.lts = bool(lts) if not isinstance(lts, str) else lts.lower() not in {"false", "no"}
                lr.discontinued = bool(r.get("discontinued"))
                lr.raw_data = r
                # events: eol, eoes (extended), support/eos fields vary
                _upsert_event(db, lr, "eol", r.get("eol"))
                _upsert_event(db, lr, "eos", r.get("support") or r.get("eoas"))
                _upsert_event(db, lr, "eoes", r.get("eoes") or r.get("extendedSupport"))
            synced += 1
        except Exception:
            errors += 1
            continue
    source.last_sync_at = datetime.utcnow()
    source.last_status = "success" if errors == 0 else "partial"
    db.commit()
    return {"synced_products": synced, "errors": errors, "total": len(products)}


def _upsert_event(db: Session, release: LifecycleRelease, milestone: str, value):
    parsed = parse_date(value)
    existing = db.scalar(select(LifecycleEvent).where(LifecycleEvent.release_id_fk == release.id, LifecycleEvent.milestone_type == milestone))
    if not parsed:
        # if explicit boolean false/true not a date, store none; keep unknown
        if existing and value in (False, None, ""):
            existing.event_date = None
            existing.date_precision = "unknown"
            existing.is_approximate = True
        return
    dt, precision = parsed
    if not existing:
        existing = LifecycleEvent(release_id_fk=release.id, milestone_type=milestone, original_label=milestone)
        db.add(existing)
    existing.event_date = dt
    existing.date_precision = precision
    existing.is_approximate = precision != "day"
    existing.source_reference = "https://endoflife.date"
