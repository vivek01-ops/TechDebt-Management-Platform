from __future__ import annotations
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime

from app.models.inventory import AwsAccount, AwsRegion
from app.services.aws import get_base_session, get_account_session, test_connection, list_enabled_regions


def list_accounts(db: Session):
    return db.scalars(select(AwsAccount).order_by(AwsAccount.id.desc())).all()


def register_account(db: Session, payload: dict) -> AwsAccount:
    account_id = payload.get("account_id")
    existing = db.scalar(select(AwsAccount).where(AwsAccount.account_id == str(account_id))) if account_id else None
    # if key-based login and account_id unknown, try to resolve from STS to avoid null/dup issues
    if not existing and not account_id and payload.get("auth_type") == "keys" and payload.get("access_key_id") and payload.get("secret_access_key"):
        try:
            from app.services.aws import get_base_session, test_connection
            sess = get_base_session(
                aws_access_key_id=payload.get("access_key_id"),
                aws_secret_access_key=payload.get("secret_access_key"),
                aws_session_token=payload.get("session_token"),
            )
            ident = test_connection(sess)
            account_id = ident.get("account_id")
            if account_id:
                payload = {**payload, "account_id": str(account_id)}
                existing = db.scalar(select(AwsAccount).where(AwsAccount.account_id == str(account_id)))
        except Exception:
            pass
    if existing:
        for k, v in payload.items():
            if hasattr(existing, k) and v is not None:
                setattr(existing, k, v)
        account = existing
    else:
        account = AwsAccount(**{k: v for k, v in payload.items() if hasattr(AwsAccount, k)})
        db.add(account)
    db.commit()
    db.refresh(account)
    return account


def connect_and_discover_account(db: Session, account: AwsAccount) -> dict:
    try:
        sess = get_account_session(account)
        ident = test_connection(sess)
        if not account.account_id:
            account.account_id = ident["account_id"]
        account.last_connection_status = "connected"
        account.last_error = None
        regions = list_enabled_regions(sess)
        existing = {r.region_name for r in account.regions}
        for r in regions:
            if r not in existing:
                db.add(AwsRegion(account_id_fk=account.id, region_name=r, enabled=True))
        account.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(account)
        return {"ok": True, "identity": ident, "regions": regions}
    except Exception as e:
        account.last_connection_status = "error"
        account.last_error = str(e)
        db.commit()
        return {"ok": False, "error": str(e)}
