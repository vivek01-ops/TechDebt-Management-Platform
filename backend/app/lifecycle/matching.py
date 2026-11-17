from __future__ import annotations
import re
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.inventory import AwsResource, SoftwareInstallation
from app.models.lifecycle import LifecycleProduct, LifecycleRelease, LifecycleEvent, ResourceLifecycleMatch
from app.lifecycle.countdown import calculate_days_remaining


RUNTIME_PRODUCT_MAP = {
    "python3.8": ("python", "3.8"), "python3.9": ("python", "3.9"), "python3.10": ("python", "3.10"),
    "python3.11": ("python", "3.11"), "python3.12": ("python", "3.12"), "python3.13": ("python", "3.13"),
    "nodejs16.x": ("nodejs", "16"), "nodejs18.x": ("nodejs", "18"), "nodejs20.x": ("nodejs", "20"), "nodejs22.x": ("nodejs", "22"),
    "java8.al2": ("java", "8"), "java11": ("java", "11"), "java17": ("java", "17"), "java21": ("java", "21"),
    "dotnet6": ("dotnet", "6"), "dotnet8": ("dotnet", "8"),
}

ENGINE_PRODUCT_MAP = {
    "postgres": "postgresql", "mysql": "mysql", "mariadb": "mariadb", "aurora-postgresql": "amazon-aurora",
    "aurora-mysql": "amazon-aurora", "redis": "redis",
}


def _norm_cycle(v: str | None) -> str | None:
    if not v:
        return None
    v = str(v).strip()
    # take major.minor where possible
    m = re.match(r"^(\d+\.\d+)", v)
    if m:
        return m.group(1)
    m = re.match(r"^(\d+)", v)
    if m:
        return m.group(1)
    return v


def _find_release(db: Session, product_slug: str, cycle: str) -> LifecycleRelease | None:
    prod = db.scalar(select(LifecycleProduct).where(LifecycleProduct.product_slug == product_slug))
    if not prod:
        # try alias/title contains
        prod = db.scalar(select(LifecycleProduct).where(LifecycleProduct.title.ilike(f"%{product_slug}%")))
    if not prod:
        return None
    rel = db.scalar(select(LifecycleRelease).where(LifecycleRelease.product_id_fk == prod.id, LifecycleRelease.cycle == str(cycle)))
    if rel:
        return rel
    # try normalized compare
    rels = db.scalars(select(LifecycleRelease).where(LifecycleRelease.product_id_fk == prod.id)).all()
    for r in rels:
        if _norm_cycle(r.cycle) == _norm_cycle(cycle) or str(r.cycle) == str(cycle):
            return r
    return None


def _event_days(db: Session, release: LifecycleRelease, milestone: str):
    ev = db.scalar(select(LifecycleEvent).where(LifecycleEvent.release_id_fk == release.id, LifecycleEvent.milestone_type == milestone))
    if not ev or not ev.event_date:
        return None, "unknown"
    cr = calculate_days_remaining(ev.event_date)
    return cr.days_remaining, cr.state


def match_resource(db: Session, resource: AwsResource) -> list[ResourceLifecycleMatch]:
    matches: list[ResourceLifecycleMatch] = []
    candidates = []
    vi = resource.version_info or {}
    ti = resource.technology_identifiers or {}
    # RDS engines
    if vi.get("engine") and vi.get("engine_version"):
        eng = str(vi["engine"]).lower()
        slug = ENGINE_PRODUCT_MAP.get(eng, eng)
        candidates.append((slug, str(vi["engine_version"]), f"database:{eng}"))
    # Lambda/runtime
    runtime = vi.get("runtime") or ti.get("runtime")
    if runtime and str(runtime).lower() in RUNTIME_PRODUCT_MAP:
        slug, cyc = RUNTIME_PRODUCT_MAP[str(runtime).lower()]
        candidates.append((slug, cyc, f"runtime:{runtime}"))
    elif runtime:
        # try parse python3.x/nodejsX.x
        r = str(runtime).lower()
        m = re.match(r"python(\d+\.\d+)", r)
        if m: candidates.append(("python", m.group(1), f"runtime:{runtime}"))
        m = re.match(r"nodejs(\d+)", r)
        if m: candidates.append(("nodejs", m.group(1), f"runtime:{runtime}"))
        m = re.match(r"java(\d+)", r)
        if m: candidates.append(("java", m.group(1), f"runtime:{runtime}"))

    # software installations
    for inst in resource.software_installations:
        if inst.version:
            candidates.append((inst.name.lower(), inst.version, f"software:{inst.name}"))

    seen = set()
    for slug, version, tech_name in candidates:
        cycle = _norm_cycle(version) or str(version)
        key = (resource.id, None, slug, cycle)
        if key in seen:
            continue
        seen.add(key)
        rel = _find_release(db, slug, cycle)
        status = "exact" if rel and str(rel.cycle) == str(cycle) else "strong" if rel else "no_match"
        confidence = 95 if status == "exact" else 80 if status == "strong" else 0
        eos_days, eos_state = _event_days(db, rel, "eos") if rel else (None, "unknown")
        eol_days, eol_state = _event_days(db, rel, "eol") if rel else (None, "unknown")
        # upsert match (simple: by resource+tech)
        existing = db.scalar(select(ResourceLifecycleMatch).where(ResourceLifecycleMatch.resource_id_fk == resource.id, ResourceLifecycleMatch.technology_name == tech_name))
        if not existing:
            existing = ResourceLifecycleMatch(resource_id_fk=resource.id, technology_name=tech_name)
            db.add(existing)
        existing.release_id_fk = rel.id if rel else None
        existing.matched_version = str(version)
        existing.match_status = status if rel else "no_match"
        existing.match_confidence = confidence
        existing.match_reason = f"Matched {slug} cycle {cycle}" if rel else f"No lifecycle release found for {slug} {cycle}"
        existing.selected_source = "endoflife.date" if rel else None
        existing.days_to_eos = eos_days
        existing.days_to_eol = eol_days
        existing.eos_state = eos_state
        existing.eol_state = eol_state
        existing.computed_at = datetime.utcnow()
        existing.details_json = {"product_slug": slug, "cycle": cycle}
        matches.append(existing)
    db.flush()
    return matches


def recompute_all_matches(db: Session) -> dict:
    resources = db.scalars(select(AwsResource).where(AwsResource.is_missing == False)).all()  # noqa: E712
    count = 0
    for r in resources:
        ms = match_resource(db, r)
        count += len(ms)
    db.commit()
    return {"resources_processed": len(resources), "matches_upserted": count}
