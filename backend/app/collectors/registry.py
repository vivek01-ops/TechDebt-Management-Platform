from __future__ import annotations
from typing import Dict, Type
from app.collectors.base import CollectorAdapter

_ADAPTERS: dict[str, CollectorAdapter] = {}


def register(adapter: CollectorAdapter):
    _ADAPTERS[adapter.service] = adapter
    return adapter


def get_adapters() -> dict[str, CollectorAdapter]:
    return dict(_ADAPTERS)


def get_adapter(service: str):
    return _ADAPTERS.get(service)
