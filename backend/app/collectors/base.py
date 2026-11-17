from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Protocol, Iterable
import boto3


@dataclass
class NormalizedResource:
    service: str
    resource_type: str
    resource_id: str
    arn: str | None = None
    name: str | None = None
    region: str | None = None
    normalized_state: str | None = None
    original_state: str | None = None
    is_running_applicable: bool = True
    discovery_source: str = "boto3"
    enrichment_status: str = "enriched"
    data_completeness: str = "partial"
    version_info: dict[str, Any] | None = None
    technology_identifiers: dict[str, Any] | None = None
    raw_metadata: dict[str, Any] | None = None
    tags: dict[str, str] = field(default_factory=dict)


@dataclass
class CollectionResult:
    resources: list[NormalizedResource] = field(default_factory=list)
    errors: list[dict[str, Any]] = field(default_factory=list)
    coverage: dict[str, Any] | None = None


class CollectorAdapter(Protocol):
    service: str
    resource_types: list[str]
    discovery_source: str

    def collect(self, session: boto3.Session, region: str | None, account_id: str) -> CollectionResult:
        ...
