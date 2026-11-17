from fastapi import APIRouter

router = APIRouter()


@router.get("")
def list_remediation():
    return {"items": [], "total": 0}
