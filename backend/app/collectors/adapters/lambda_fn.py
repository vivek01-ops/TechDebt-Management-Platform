from __future__ import annotations
import boto3
from botocore.exceptions import ClientError

from app.collectors.base import CollectionResult, NormalizedResource
from app.collectors.registry import register


class LambdaCollector:
    service = "lambda"
    resource_types = ["AWS::Lambda::Function"]
    discovery_source = "boto3"

    def collect(self, session: boto3.Session, region: str | None, account_id: str) -> CollectionResult:
        result = CollectionResult()
        if not region:
            return result
        lam = session.client("lambda", region_name=region)
        try:
            paginator = lam.get_paginator("list_functions")
            for page in paginator.paginate():
                for fn in page.get("Functions", []):
                    runtime = fn.get("Runtime")
                    state = fn.get("State") or "Active"
                    name = fn.get("FunctionName")
                    arn = fn.get("FunctionArn")
                    tags = {}
                    try:
                        if arn:
                            tags = lam.list_tags(Resource=arn).get("Tags", {})
                    except Exception:
                        pass
                    result.resources.append(NormalizedResource(
                        service="lambda", resource_type="AWS::Lambda::Function", resource_id=name,
                        arn=arn, name=name, region=region,
                        normalized_state="Available" if state == "Active" else state,
                        original_state=state, discovery_source="boto3", enrichment_status="enriched", data_completeness="partial",
                        version_info={"runtime": runtime, "package_type": fn.get("PackageType")},
                        technology_identifiers={"runtime": runtime}, tags=tags,
                        raw_metadata={"LastModified": fn.get("LastModified"), "MemorySize": fn.get("MemorySize")},
                    ))
        except ClientError as e:
            result.errors.append({"service": "lambda", "resource_type": "AWS::Lambda::Function", "region": region, "error": str(e), "code": e.response.get("Error", {}).get("Code")})
        except Exception as e:
            result.errors.append({"service": "lambda", "resource_type": "AWS::Lambda::Function", "region": region, "error": str(e)})
        return result


register(LambdaCollector())
