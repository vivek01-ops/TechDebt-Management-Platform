import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


def _sanitize_aws_env():
    # Empty AWS profile env vars cause botocore to look for profile named ""
    for k in ("AWS_PROFILE", "AWS_DEFAULT_PROFILE"):
        v = os.environ.get(k)
        if v is not None and str(v).strip() == "":
            os.environ.pop(k, None)


_sanitize_aws_env()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "TechDebt Management Platform"
    app_version: str = "0.1.0"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    secret_key: str = Field(default="change-me-in-production", min_length=16)

    database_url: str = "postgresql+psycopg://techdebt:techdebt@localhost:5432/techdebt"
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str | None = None
    celery_result_backend: str | None = None

    aws_profile: str | None = None
    aws_region: str | None = None
    aws_assume_role_arn: str | None = None
    aws_external_id: str | None = None

    endoflife_api_base: str = "https://endoflife.date/api/v1"
    lifecycle_sync_hours: int = 12
    inventory_scan_hours: int = 24
    lifecycle_recalc_hours: int = 24

    log_level: str = "INFO"
    timezone: str = "UTC"

    @field_validator("aws_profile", "aws_region", "aws_assume_role_arn", "aws_external_id", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v is None:
            return None
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


settings = Settings()
_sanitize_aws_env()
