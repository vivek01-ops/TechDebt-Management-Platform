from fastapi import APIRouter

from app.api.v1.endpoints import health, accounts, resources, lifecycle, dashboard, collections, remediation

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(resources.router, prefix="/resources", tags=["resources"])
api_router.include_router(lifecycle.router, prefix="/lifecycle", tags=["lifecycle"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(collections.router, prefix="/collections", tags=["collections"])
api_router.include_router(remediation.router, prefix="/remediation", tags=["remediation"])
