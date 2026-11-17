from __future__ import annotations
import os
import boto3
from botocore.config import Config
from typing import Any

from app.core.config import settings


def _clean(val: str | None) -> str | None:
    if val is None:
        return None
    v = str(val).strip()
    return v or None


def get_base_session(profile_name: str | None = None, region_name: str | None = None,
                    aws_access_key_id: str | None = None, aws_secret_access_key: str | None = None,
                    aws_session_token: str | None = None):
    region = _clean(region_name) or _clean(settings.aws_region)
    access_key = _clean(aws_access_key_id)
    secret_key = _clean(aws_secret_access_key)
    token = _clean(aws_session_token)
    if access_key and secret_key:
        # avoid empty AWS profile env vars interfering with explicit credentials
        prev_profile = os.environ.get("AWS_PROFILE")
        prev_default = os.environ.get("AWS_DEFAULT_PROFILE")
        removed = []
        for k, v in [("AWS_PROFILE", prev_profile), ("AWS_DEFAULT_PROFILE", prev_default)]:
            if v is not None and str(v).strip() == "":
                os.environ.pop(k, None)
                removed.append((k, v))
        try:
            return boto3.Session(
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                aws_session_token=token,
                region_name=region,
            )
        finally:
            for k, v in removed:
                if k not in os.environ:
                    os.environ[k] = v
    profile = _clean(profile_name) or _clean(settings.aws_profile)
    if profile:
        return boto3.Session(profile_name=profile, region_name=region)
    # also guard empty AWS profile env vars causing botocore to look up profile ""
    prev_profile = os.environ.get("AWS_PROFILE")
    prev_default = os.environ.get("AWS_DEFAULT_PROFILE")
    removed = []
    for k, v in [("AWS_PROFILE", prev_profile), ("AWS_DEFAULT_PROFILE", prev_default)]:
        if v is not None and str(v).strip() == "":
            os.environ.pop(k, None)
            removed.append((k, v))
    if removed:
        try:
            return boto3.Session(region_name=region)
        finally:
            for k, v in removed:
                if k not in os.environ:
                    os.environ[k] = v
    return boto3.Session(region_name=region)


def assume_role_session(role_arn: str, external_id: str | None = None, base_session=None, region_name: str | None = None, session_name: str = "TechDebtPlatform"):
    base = base_session or get_base_session(region_name=region_name)
    sts = base.client("sts", config=Config(retries={"max_attempts": 5, "mode": "standard"}))
    params: dict[str, Any] = {"RoleArn": role_arn, "RoleSessionName": session_name}
    if external_id:
        params["ExternalId"] = external_id
    creds = sts.assume_role(**params)["Credentials"]
    return boto3.Session(
        aws_access_key_id=creds["AccessKeyId"],
        aws_secret_access_key=creds["SecretAccessKey"],
        aws_session_token=creds["SessionToken"],
        region_name=region_name or base.region_name,
    )


def get_account_session(account, region_name: str | None = None):
    auth_type = getattr(account, "auth_type", "profile")
    if auth_type == "keys" and getattr(account, "access_key_id", None) and getattr(account, "secret_access_key", None):
        base = get_base_session(
            region_name=region_name,
            aws_access_key_id=getattr(account, "access_key_id", None),
            aws_secret_access_key=getattr(account, "secret_access_key", None),
            aws_session_token=getattr(account, "session_token", None),
        )
    else:
        base = get_base_session(getattr(account, "profile_name", None), region_name)
    role_arn = getattr(account, "role_arn", None) or (settings.aws_assume_role_arn if not getattr(account, "profile_name", None) and auth_type != "keys" else None)
    external_id = getattr(account, "external_id", None) or settings.aws_external_id
    if role_arn:
        return assume_role_session(role_arn, external_id, base_session=base, region_name=region_name)
    return base


def test_connection(session=None) -> dict[str, Any]:
    sess = session or get_base_session()
    sts = sess.client("sts", config=Config(retries={"max_attempts": 3, "mode": "standard"}))
    ident = sts.get_caller_identity()
    return {
        "account_id": ident.get("Account"),
        "arn": ident.get("Arn"),
        "user_id": ident.get("UserId"),
        "region": sess.region_name,
    }


def list_enabled_regions(session=None) -> list[str]:
    sess = session or get_base_session()
    ec2 = sess.client("ec2", region_name=sess.region_name or "us-east-1")
    try:
        resp = ec2.describe_regions(AllRegions=False)
        return sorted([r["RegionName"] for r in resp.get("Regions", []) if r.get("OptInStatus") in ("opt-in-not-required", "opted-in")])
    except Exception:
        # fallback common regions
        return [sess.region_name or "us-east-1"]
