from __future__ import annotations
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, ForeignKey, Boolean, Text, Integer, JSON, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    contact: Mapped[str | None] = mapped_column(String(255))


class OwnershipAssignment(Base):
    __tablename__ = "ownership_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    resource_id_fk: Mapped[int] = mapped_column(ForeignKey("aws_resources.id", ondelete="CASCADE"), index=True)
    team_id_fk: Mapped[int | None] = mapped_column(ForeignKey("teams.id", ondelete="SET NULL"), index=True)
    owner: Mapped[str | None] = mapped_column(String(255))
    application: Mapped[str | None] = mapped_column(String(255))
    environment: Mapped[str | None] = mapped_column(String(64), index=True)
    source: Mapped[str] = mapped_column(String(64), default="tag")  # tag, rule, manual, account
    is_manual_override: Mapped[bool] = mapped_column(Boolean, default=False)


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    resource_id_fk: Mapped[int] = mapped_column(ForeignKey("aws_resources.id", ondelete="CASCADE"), index=True)
    match_id_fk: Mapped[int | None] = mapped_column(ForeignKey("resource_lifecycle_matches.id", ondelete="SET NULL"), index=True)
    risk_level: Mapped[str] = mapped_column(String(32), index=True)
    score: Mapped[float] = mapped_column(Float, default=0)
    urgency: Mapped[str | None] = mapped_column(String(32))
    explanation: Mapped[str | None] = mapped_column(Text)
    factors: Mapped[dict | None] = mapped_column(JSON)
    assessed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RemediationRecord(Base):
    __tablename__ = "remediation_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    resource_id_fk: Mapped[int] = mapped_column(ForeignKey("aws_resources.id", ondelete="CASCADE"), index=True)
    match_id_fk: Mapped[int | None] = mapped_column(ForeignKey("resource_lifecycle_matches.id", ondelete="SET NULL"))
    team_id_fk: Mapped[int | None] = mapped_column(ForeignKey("teams.id", ondelete="SET NULL"))
    owner: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), default="Not Started", index=True)
    target_upgrade: Mapped[str | None] = mapped_column(String(255))
    target_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    risk_accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CollectionJob(Base):
    __tablename__ = "collection_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_type: Mapped[str] = mapped_column(String(64), index=True)
    scope: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(32), default="queued", index=True)
    schedule: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CollectionRun(Base):
    __tablename__ = "collection_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id_fk: Mapped[int | None] = mapped_column(ForeignKey("collection_jobs.id", ondelete="SET NULL"), index=True)
    account_id_fk: Mapped[int | None] = mapped_column(ForeignKey("aws_accounts.id", ondelete="SET NULL"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="running", index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    summary: Mapped[dict | None] = mapped_column(JSON)
    error_message: Mapped[str | None] = mapped_column(Text)


class CollectionError(Base):
    __tablename__ = "collection_errors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id_fk: Mapped[int | None] = mapped_column(ForeignKey("collection_runs.id", ondelete="CASCADE"), index=True)
    account_id_fk: Mapped[int | None] = mapped_column(ForeignKey("aws_accounts.id", ondelete="SET NULL"), index=True)
    region: Mapped[str | None] = mapped_column(String(64))
    service: Mapped[str | None] = mapped_column(String(128))
    resource_type: Mapped[str | None] = mapped_column(String(128))
    error_type: Mapped[str] = mapped_column(String(64))  # retryable, permanent, permission, throttling
    message: Mapped[str] = mapped_column(Text)
    details: Mapped[dict | None] = mapped_column(JSON)
    occurred_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CollectorCoverage(Base):
    __tablename__ = "collector_coverage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    aws_service: Mapped[str] = mapped_column(String(128), index=True)
    resource_type: Mapped[str] = mapped_column(String(128), index=True)
    discovery_source: Mapped[str] = mapped_column(String(64))
    adapter_status: Mapped[str] = mapped_column(String(64))  # implemented, generic, planned
    enrichment_support: Mapped[bool] = mapped_column(Boolean, default=False)
    version_support: Mapped[bool] = mapped_column(Boolean, default=False)
    operational_state_support: Mapped[bool] = mapped_column(Boolean, default=False)
    coverage_status: Mapped[str] = mapped_column(String(64), index=True)
    last_collection_at: Mapped[datetime | None] = mapped_column(DateTime)
    test_status: Mapped[str] = mapped_column(String(64), default="unknown")
    known_limitations: Mapped[str | None] = mapped_column(Text)
    required_permissions: Mapped[list[str] | None] = mapped_column(JSON)


class InventorySnapshot(Base):
    __tablename__ = "inventory_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    snapshot_date: Mapped[date] = mapped_column(Date, index=True)
    scope: Mapped[dict | None] = mapped_column(JSON)
    metrics: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
