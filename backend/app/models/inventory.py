from __future__ import annotations
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Boolean, Text, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class AwsAccount(Base):
    __tablename__ = "aws_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[str | None] = mapped_column(String(20), unique=True, index=True, nullable=True)
    account_name: Mapped[str | None] = mapped_column(String(255))
    organization_id: Mapped[str | None] = mapped_column(String(64))
    is_management: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(32), default="active")
    auth_type: Mapped[str] = mapped_column(String(32), default="keys")  # keys, profile, role
    profile_name: Mapped[str | None] = mapped_column(String(255))
    access_key_id: Mapped[str | None] = mapped_column(String(128))
    secret_access_key: Mapped[str | None] = mapped_column(String(128))
    session_token: Mapped[str | None] = mapped_column(Text)
    role_arn: Mapped[str | None] = mapped_column(String(512))
    external_id: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_connection_status: Mapped[str | None] = mapped_column(String(64))
    last_error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    regions: Mapped[list[AwsRegion]] = relationship(back_populates="account", cascade="all, delete-orphan")
    resources: Mapped[list[AwsResource]] = relationship(back_populates="account")


class AwsRegion(Base):
    __tablename__ = "aws_regions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id_fk: Mapped[int] = mapped_column(ForeignKey("aws_accounts.id", ondelete="CASCADE"), index=True)
    region_name: Mapped[str] = mapped_column(String(64), index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_collection_status: Mapped[str | None] = mapped_column(String(64))
    last_collected_at: Mapped[datetime | None] = mapped_column(DateTime)
    last_error: Mapped[str | None] = mapped_column(Text)

    account: Mapped[AwsAccount] = relationship(back_populates="regions")


class AwsResource(Base):
    __tablename__ = "aws_resources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id_fk: Mapped[int] = mapped_column(ForeignKey("aws_accounts.id", ondelete="CASCADE"), index=True)
    region: Mapped[str | None] = mapped_column(String(64), index=True)
    service: Mapped[str] = mapped_column(String(128), index=True)
    resource_type: Mapped[str] = mapped_column(String(128), index=True)
    resource_id: Mapped[str] = mapped_column(String(512), index=True)
    arn: Mapped[str | None] = mapped_column(String(1024), index=True)
    name: Mapped[str | None] = mapped_column(String(512))
    normalized_state: Mapped[str | None] = mapped_column(String(64), index=True)
    original_state: Mapped[str | None] = mapped_column(String(128))
    is_running_applicable: Mapped[bool] = mapped_column(Boolean, default=True)
    discovery_source: Mapped[str | None] = mapped_column(String(64))
    enrichment_status: Mapped[str] = mapped_column(String(64), default="discovered")
    data_completeness: Mapped[str] = mapped_column(String(64), default="partial")
    version_info: Mapped[dict | None] = mapped_column(JSON)
    technology_identifiers: Mapped[dict | None] = mapped_column(JSON)
    raw_metadata: Mapped[dict | None] = mapped_column(JSON)
    created_at_aws: Mapped[datetime | None] = mapped_column(DateTime)
    last_modified_at_aws: Mapped[datetime | None] = mapped_column(DateTime)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_missing: Mapped[bool] = mapped_column(Boolean, default=False)

    account: Mapped[AwsAccount] = relationship(back_populates="resources")
    tags: Mapped[list[ResourceTag]] = relationship(back_populates="resource", cascade="all, delete-orphan")
    software_installations: Mapped[list[SoftwareInstallation]] = relationship(back_populates="resource", cascade="all, delete-orphan")


class ResourceTag(Base):
    __tablename__ = "resource_tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    resource_id_fk: Mapped[int] = mapped_column(ForeignKey("aws_resources.id", ondelete="CASCADE"), index=True)
    key: Mapped[str] = mapped_column(String(256), index=True)
    value: Mapped[str | None] = mapped_column(Text)

    resource: Mapped[AwsResource] = relationship(back_populates="tags")


class SoftwareComponent(Base):
    __tablename__ = "software_components"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    vendor: Mapped[str | None] = mapped_column(String(255))
    component_type: Mapped[str] = mapped_column(String(64), default="package")  # os, runtime, db, package, framework, image
    normalized_name: Mapped[str] = mapped_column(String(255), index=True)


class SoftwareInstallation(Base):
    __tablename__ = "software_installations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    resource_id_fk: Mapped[int] = mapped_column(ForeignKey("aws_resources.id", ondelete="CASCADE"), index=True)
    component_id_fk: Mapped[int | None] = mapped_column(ForeignKey("software_components.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(String(255), index=True)
    version: Mapped[str | None] = mapped_column(String(128), index=True)
    install_path: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(64), default="unknown")  # ssm, ecr, sbom, k8s, api
    confidence: Mapped[str] = mapped_column(String(32), default="unknown")
    first_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    metadata_json: Mapped[dict | None] = mapped_column(JSON)

    resource: Mapped[AwsResource] = relationship(back_populates="software_installations")
    component: Mapped[SoftwareComponent | None] = relationship()
