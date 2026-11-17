from __future__ import annotations
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, ForeignKey, Boolean, Text, Integer, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class LifecycleSource(Base):
    __tablename__ = "lifecycle_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True)
    kind: Mapped[str] = mapped_column(String(64))  # endoflife, aws_health, vendor
    base_url: Mapped[str | None] = mapped_column(String(512))
    precedence: Mapped[int] = mapped_column(Integer, default=100)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime)
    last_status: Mapped[str | None] = mapped_column(String(64))
    last_error: Mapped[str | None] = mapped_column(Text)


class LifecycleProduct(Base):
    __tablename__ = "lifecycle_products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_id_fk: Mapped[int] = mapped_column(ForeignKey("lifecycle_sources.id", ondelete="CASCADE"), index=True)
    product_slug: Mapped[str] = mapped_column(String(255), index=True)
    title: Mapped[str] = mapped_column(String(255))
    category: Mapped[str | None] = mapped_column(String(128))
    vendor: Mapped[str | None] = mapped_column(String(255))
    aliases: Mapped[list[str] | None] = mapped_column(JSON)
    homepage: Mapped[str | None] = mapped_column(String(512))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    source: Mapped[LifecycleSource] = relationship()
    releases: Mapped[list[LifecycleRelease]] = relationship(back_populates="product", cascade="all, delete-orphan")
    __table_args__ = (UniqueConstraint("source_id_fk", "product_slug", name="uq_product_source_slug"),)


class LifecycleRelease(Base):
    __tablename__ = "lifecycle_releases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id_fk: Mapped[int] = mapped_column(ForeignKey("lifecycle_products.id", ondelete="CASCADE"), index=True)
    cycle: Mapped[str] = mapped_column(String(128), index=True)
    release_label: Mapped[str | None] = mapped_column(String(255))
    release_date: Mapped[date | None] = mapped_column(Date)
    latest_version: Mapped[str | None] = mapped_column(String(128))
    latest_patch_date: Mapped[date | None] = mapped_column(Date)
    lts: Mapped[bool] = mapped_column(Boolean, default=False)
    discontinued: Mapped[bool] = mapped_column(Boolean, default=False)
    raw_data: Mapped[dict | None] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product: Mapped[LifecycleProduct] = relationship(back_populates="releases")
    events: Mapped[list[LifecycleEvent]] = relationship(back_populates="release", cascade="all, delete-orphan")
    __table_args__ = (UniqueConstraint("product_id_fk", "cycle", name="uq_release_product_cycle"),)


class LifecycleEvent(Base):
    __tablename__ = "lifecycle_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    release_id_fk: Mapped[int] = mapped_column(ForeignKey("lifecycle_releases.id", ondelete="CASCADE"), index=True)
    milestone_type: Mapped[str] = mapped_column(String(64), index=True)  # eol, eos, eoss, eoes, deprecated, ga, vendor
    original_label: Mapped[str | None] = mapped_column(String(255))
    event_date: Mapped[date | None] = mapped_column(Date, index=True)
    date_precision: Mapped[str] = mapped_column(String(16), default="day")  # day, month, year, unknown
    is_approximate: Mapped[bool] = mapped_column(Boolean, default=False)
    source_reference: Mapped[str | None] = mapped_column(String(1024))
    notes: Mapped[str | None] = mapped_column(Text)

    release: Mapped[LifecycleRelease] = relationship(back_populates="events")


class ResourceLifecycleMatch(Base):
    __tablename__ = "resource_lifecycle_matches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    resource_id_fk: Mapped[int] = mapped_column(ForeignKey("aws_resources.id", ondelete="CASCADE"), index=True)
    software_installation_id_fk: Mapped[int | None] = mapped_column(ForeignKey("software_installations.id", ondelete="CASCADE"), index=True)
    release_id_fk: Mapped[int | None] = mapped_column(ForeignKey("lifecycle_releases.id", ondelete="SET NULL"), index=True)
    technology_name: Mapped[str] = mapped_column(String(255), index=True)
    matched_version: Mapped[str | None] = mapped_column(String(128))
    match_status: Mapped[str] = mapped_column(String(32), index=True)  # exact,strong,partial,ambiguous,no_match,unsupported,insufficient
    match_confidence: Mapped[int] = mapped_column(Integer, default=0)
    match_reason: Mapped[str | None] = mapped_column(Text)
    selected_source: Mapped[str | None] = mapped_column(String(128))
    days_to_eos: Mapped[int | None] = mapped_column(Integer)
    days_to_eol: Mapped[int | None] = mapped_column(Integer)
    eos_state: Mapped[str | None] = mapped_column(String(32))
    eol_state: Mapped[str | None] = mapped_column(String(32))
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    details_json: Mapped[dict | None] = mapped_column(JSON)
