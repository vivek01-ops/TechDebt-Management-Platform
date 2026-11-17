from __future__ import annotations
import boto3
from botocore.exceptions import ClientError

from app.collectors.base import CollectionResult, NormalizedResource
from app.collectors.registry import register


class S3Collector:
    service = "s3"
    resource_types = ["AWS::S3::Bucket"]
    discovery_source = "boto3"

    def collect(self, session: boto3.Session, region: str | None, account_id: str) -> CollectionResult:
        # S3 buckets are global list; collect once (when region is us-east-1 or primary) to avoid duplicates in simple runs
        result = CollectionResult()
        if region and region != "us-east-1":
            return result
        s3 = session.client("s3")
        try:
            resp = s3.list_buckets()
            for b in resp.get("Buckets", []):
                name = b.get("Name")
                bucket_region = None
                try:
                    loc = s3.get_bucket_location(Bucket=name).get("LocationConstraint")
                    bucket_region = loc or "us-east-1"
                except Exception:
                    bucket_region = "unknown"
                result.resources.append(NormalizedResource(
                    service="s3", resource_type="AWS::S3::Bucket", resource_id=name,
                    arn=f"arn:aws:s3:::{name}", name=name, region=bucket_region,
                    normalized_state="Not applicable", original_state=None, is_running_applicable=False,
                    discovery_source="boto3", enrichment_status="discovered", data_completeness="basic",
                    tags={}, raw_metadata={"CreationDate": str(b.get("CreationDate"))},
                ))
        except ClientError as e:
            result.errors.append({"service": "s3", "resource_type": "AWS::S3::Bucket", "region": region, "error": str(e), "code": e.response.get("Error", {}).get("Code")})
        except Exception as e:
            result.errors.append({"service": "s3", "resource_type": "AWS::S3::Bucket", "region": region, "error": str(e)})
        return result


register(S3Collector())
