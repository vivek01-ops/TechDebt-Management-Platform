from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.services import accounts as account_svc
from app.services.aws import get_base_session, test_connection, list_enabled_regions
from app.models.inventory import AwsAccount

router = APIRouter()


class AccountCreate(BaseModel):
    account_id: str | None = None
    account_name: str | None = None
    auth_type: str = "keys"  # keys | profile | role
    profile_name: str | None = None
    access_key_id: str | None = None
    secret_access_key: str | None = None
    session_token: str | None = None
    role_arn: str | None = None
    external_id: str | None = None


class TestCredentials(BaseModel):
    access_key_id: str
    secret_access_key: str
    session_token: str | None = None
    region: str | None = None


@router.get("")
def list_accounts(db: Session = Depends(get_db)):
    items = account_svc.list_accounts(db)
    return {
        "items": [
            {
                "id": a.id,
                "account_id": a.account_id,
                "account_name": a.account_name,
                "status": a.status,
                "is_active": a.is_active,
                "last_connection_status": a.last_connection_status,
                "last_error": a.last_error,
                "regions_count": len(a.regions),
            }
            for a in items
        ],
        "total": len(items),
    }


@router.post("")
def register_account(payload: AccountCreate, db: Session = Depends(get_db)):
    account = account_svc.register_account(db, payload.model_dump(exclude_none=True))
    return {"id": account.id, "account_id": account.account_id, "account_name": account.account_name}


@router.post("/{account_id}/connect")
def connect_account(account_id: int, db: Session = Depends(get_db)):
    account = db.get(AwsAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account_svc.connect_and_discover_account(db, account)


@router.post("/test-connection")
def test_default_connection(payload: TestCredentials | None = None):
    try:
        if payload and payload.access_key_id and payload.secret_access_key:
            sess = get_base_session(
                region_name=payload.region,
                aws_access_key_id=payload.access_key_id,
                aws_secret_access_key=payload.secret_access_key,
                aws_session_token=payload.session_token,
            )
        else:
            sess = get_base_session()
        ident = test_connection(sess)
        regions = list_enabled_regions(sess)
        return {"ok": True, "identity": ident, "regions": regions}
    except Exception as e:
        return {"ok": False, "error": str(e)}

