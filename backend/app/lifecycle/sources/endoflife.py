from __future__ import annotations
import httpx
from datetime import datetime
from typing import Any

from app.core.config import settings


class EndOfLifeDateClient:
    def __init__(self, base_url: str | None = None, timeout: float = 30.0):
        self.base_url = (base_url or settings.endoflife_api_base).rstrip("/")
        self.timeout = timeout

    async def list_products(self) -> list[dict[str, Any]]:
        # API v1: /products returns catalog; structure may vary, handle flexibly
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(f"{self.base_url}/products")
            resp.raise_for_status()
            data = resp.json()
        if isinstance(data, dict) and "result" in data:
            data = data["result"]
        if isinstance(data, list):
            return data
        return []

    async def get_product(self, product: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(f"{self.base_url}/products/{product}")
            resp.raise_for_status()
            data = resp.json()
        if isinstance(data, dict) and "result" in data:
            return data["result"]
        return data if isinstance(data, dict) else {"result": data}


def parse_date(value: Any):
    if value is None or value is False:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, str):
        v = value.strip()
        if not v or v.lower() in {"false", "true", "unknown"}:
            return None
        for fmt in ("%Y-%m-%d", "%Y-%m", "%Y"):
            try:
                dt = datetime.strptime(v, fmt).date()
                return dt, ("day" if fmt == "%Y-%m-%d" else "month" if fmt == "%Y-%m" else "year")
            except ValueError:
                continue
    return None
